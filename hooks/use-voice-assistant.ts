"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { KokoroTTS } from "kokoro-js";
import { toast } from "sonner";
import type { VoiceAssistantClientConfig } from "@/lib/voice/config";
import {
  getKokoroInferenceOptions,
  getRecordingDecision,
  canStartVoiceRecording,
  clearOwnedPlaybackSettlement,
  isSleepCommand,
  isVoiceExplicitlyDisabled,
  prepareSpeechChunks,
  reconnectDelayMs,
  runSpeechChunkPipeline,
  shouldAutoEnableVoice,
  shouldReconnectWakeSocket,
  shouldStartConversationalFollowup,
} from "@/lib/voice/runtime-policy";
import {
  getVoiceStatusLabel,
  reduceVoiceState,
  type VoiceAssistantStatus,
} from "@/lib/voice/state";

const PREFERENCE_KEY = "infra-watch:ania:voice-enabled";
const SILENCE_THRESHOLD = 0.025;
const MAX_RECORDING_MS = 20_000;
const RETRY_PROMPT = "I didn’t hear a command. Please try again.";
const WAKE_SOCKET_CONNECT_TIMEOUT_MS = 10_000;

type UseVoiceAssistantOptions = {
  config: VoiceAssistantClientConfig;
  submitCommand: (text: string) => Promise<string | undefined>;
  cancelCommand?: () => void;
  onWakeDetected?: () => void;
  onTranscription?: (text: string) => void;
  onSleep?: () => void;
};

type VoiceAssistantController = {
  enabled: boolean;
  status: VoiceAssistantStatus;
  statusLabel: string;
  toggle: () => void;
};

function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
    .find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function downsampleTo16Khz(input: Float32Array, sampleRate: number) {
  if (sampleRate === 16_000) return input;
  const ratio = sampleRate / 16_000;
  const length = Math.round(input.length / ratio);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    output[index] = input[Math.min(input.length - 1, Math.floor(index * ratio))] ?? 0;
  }
  return output;
}

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer;
}

function readableError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone access was denied. Allow microphone access to use ANIA.";
  }
  return error instanceof Error && error.message.trim()
    ? error.message
    : "ANIA voice mode encountered an error.";
}

export function useVoiceAssistant({
  config,
  submitCommand,
  cancelCommand,
  onWakeDetected,
  onTranscription,
  onSleep,
}: UseVoiceAssistantOptions): VoiceAssistantController {
  const [state, dispatch] = useReducer(reduceVoiceState, {
    enabled: false,
    status: "idle" as VoiceAssistantStatus,
  });
  const stateRef = useRef(state);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingClaimRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settlePlaybackRef = useRef<(() => void) | null>(null);
  const silenceFrameRef = useRef<number | null>(null);
  const submitCommandRef = useRef(submitCommand);
  const cancelCommandRef = useRef(cancelCommand);
  const onWakeDetectedRef = useRef(onWakeDetected);
  const onTranscriptionRef = useRef(onTranscription);
  const onSleepRef = useRef(onSleep);
  const operationRef = useRef(0);
  const transcriptionControllerRef = useRef<AbortController | null>(null);
  const enablingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const connectWakeSocketRef = useRef<((operation: number) => Promise<void>) | null>(null);
  const kokoroRef = useRef<Promise<KokoroTTS> | null>(null);
  const explicitlyDisabledRef = useRef(false);
  const startRecordingRef = useRef<((retryAttempt?: number) => void) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    submitCommandRef.current = submitCommand;
    cancelCommandRef.current = cancelCommand;
    onWakeDetectedRef.current = onWakeDetected;
    onTranscriptionRef.current = onTranscription;
    onSleepRef.current = onSleep;
  }, [cancelCommand, onSleep, onTranscription, onWakeDetected, submitCommand]);

  const stopRecordingMonitor = useCallback(() => {
    if (silenceFrameRef.current !== null) cancelAnimationFrame(silenceFrameRef.current);
    silenceFrameRef.current = null;
  }, []);

  const stopResources = useCallback(() => {
    operationRef.current += 1;
    enablingRef.current = false;
    if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    reconnectAttemptRef.current = 0;
    transcriptionControllerRef.current?.abort();
    transcriptionControllerRef.current = null;
    if (stateRef.current.status === "thinking") cancelCommandRef.current?.();
    stopRecordingMonitor();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.stop();
    }
    recorderRef.current = null;
    recordingClaimRef.current = false;
    processorRef.current?.disconnect();
    processorRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    settlePlaybackRef.current?.();
    settlePlaybackRef.current = null;
    audioRef.current = null;
  }, [stopRecordingMonitor]);

  const loadKokoro = useCallback(() => {
    if (!kokoroRef.current) {
      kokoroRef.current = import("kokoro-js")
        .then(({ KokoroTTS }) =>
          KokoroTTS.from_pretrained(config.kokoroModel, getKokoroInferenceOptions()),
        )
        .catch((error) => {
          kokoroRef.current = null;
          throw error;
        });
    }
    return kokoroRef.current;
  }, [config.kokoroModel]);

  const speak = useCallback(
    async (text: string, operation: number) => {
      const speechChunks = prepareSpeechChunks(text);
      if (!speechChunks.length || operationRef.current !== operation) return false;

      const tts = await loadKokoro();
      if (operationRef.current !== operation) return false;
      let speechStarted = false;
      return runSpeechChunkPipeline({
        chunks: speechChunks,
        generate: (speech) =>
          tts.generate(speech, {
            voice: config.kokoroVoice as "af_heart",
          }),
        shouldContinue: () => operationRef.current === operation,
        play: async (generated, onStarted) => {
          const url = URL.createObjectURL(generated.toBlob());
          let audio: HTMLAudioElement | null = null;
          let ownedSettlement: (() => void) | null = null;
          try {
            if (operationRef.current !== operation) return false;
            audio = new Audio(url);
            const playback = audio;
            audioRef.current = playback;
            const playbackEnded = new Promise<void>((resolve, reject) => {
              const settle = () => {
                if (settlePlaybackRef.current === settle) settlePlaybackRef.current = null;
                resolve();
              };
              ownedSettlement = settle;
              settlePlaybackRef.current = settle;
              playback.onended = settle;
              playback.onerror = () => {
                if (settlePlaybackRef.current === settle) settlePlaybackRef.current = null;
                reject(new Error("ANIA audio playback failed."));
              };
            });
            void playbackEnded.catch(() => undefined);
            await playback.play();
            if (operationRef.current !== operation) {
              playback.pause();
              return false;
            }
            if (!speechStarted) {
              speechStarted = true;
              dispatch({ type: "SPEECH_STARTED" });
            }
            onStarted();
            await playbackEnded;
            return operationRef.current === operation;
          } finally {
            URL.revokeObjectURL(url);
            if (audioRef.current === audio) audioRef.current = null;
            clearOwnedPlaybackSettlement(settlePlaybackRef, ownedSettlement);
          }
        },
      });
    },
    [config.kokoroVoice, loadKokoro],
  );

  const processRecording = useCallback(
    async (blob: Blob, operation: number, retryAttempt: number) => {
      if (operationRef.current !== operation) return;
      dispatch({ type: "RECORDING_STOPPED" });
      const form = new FormData();
      form.set("audio", blob, blob.type.includes("mp4") ? "command.mp4" : "command.webm");
      const controller = new AbortController();
      transcriptionControllerRef.current = controller;
      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      if (operationRef.current !== operation) return;
      transcriptionControllerRef.current = null;
      const payload = (await response.json().catch(() => null)) as
        | { text?: string; error?: string }
        | null;
      if (!response.ok || !payload?.text) {
        throw new Error(payload?.error ?? "ANIA could not transcribe the command.");
      }
      if (operationRef.current !== operation) return;
      if (isSleepCommand(payload.text)) {
        cancelCommandRef.current?.();
        onSleepRef.current?.();
        dispatch({ type: "RESET" });
        return;
      }
      onTranscriptionRef.current?.(payload.text);
      dispatch({ type: "TRANSCRIPTION_READY" });
      const answer = await submitCommandRef.current(payload.text);
      if (operationRef.current !== operation) return;
      if (!answer?.trim()) throw new Error("ANIA did not receive a complete response.");
      dispatch({ type: "RESPONSE_READY" });
      const spoken = await speak(answer, operation);
      if (!spoken || operationRef.current !== operation) return;
      dispatch({ type: "SPEECH_ENDED" });
      if (
        shouldStartConversationalFollowup({
          enabled: stateRef.current.enabled,
          operationMatches: operationRef.current === operation,
          alreadyFollowup: retryAttempt === 2,
        })
      ) {
        setTimeout(() => startRecordingRef.current?.(2), 0);
      }
    },
    [speak],
  );

  const startRecording = useCallback((retryAttempt = 0) => {
    const stream = streamRef.current;
    if (
      !stream ||
      !canStartVoiceRecording({
        hasStream: true,
        recordingClaimed: recordingClaimRef.current,
        recorderActive:
          recorderRef.current !== null && recorderRef.current.state !== "inactive",
      }) ||
      (retryAttempt === 0 && stateRef.current.status !== "listening_for_wake_word")
    ) {
      return;
    }
    recordingClaimRef.current = true;
    if (retryAttempt === 0) {
      onWakeDetectedRef.current?.();
      dispatch({ type: "WAKE_DETECTED" });
    } else if (retryAttempt === 2) {
      dispatch({ type: "WAKE_DETECTED" });
    }
    const operation = operationRef.current;

    const chunks: Blob[] = [];
    const mimeType = recordingMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      recordingClaimRef.current = false;
      throw error;
    }
    recorderRef.current = recorder;
    let stopReason: "process" | "ask_again" | "return_to_wake" = "process";
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      recordingClaimRef.current = false;
      recorderRef.current = null;
      toast.error("ANIA could not record the microphone audio.");
      dispatch({ type: "RESET" });
    };
    recorder.onstop = () => {
      stopRecordingMonitor();
      recordingClaimRef.current = false;
      recorderRef.current = null;
      if (operationRef.current !== operation) return;

      if (stopReason === "return_to_wake") {
        dispatch({ type: "RESET" });
        return;
      }

      if (stopReason === "ask_again") {
        dispatch({ type: "RETRY_REQUESTED" });
        void speak(RETRY_PROMPT, operation)
          .then((spoken) => {
            if (!spoken || operationRef.current !== operation) return;
            dispatch({ type: "RETRY_LISTENING" });
            setTimeout(() => startRecordingRef.current?.(1), 0);
          })
          .catch((error) => {
            if (operationRef.current !== operation) return;
            toast.error("ANIA could not play the retry prompt.", {
              description: readableError(error),
            });
            dispatch({ type: "RESET" });
          });
        return;
      }

      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      void processRecording(blob, operation, retryAttempt).catch((error) => {
        if (operationRef.current !== operation) return;
        toast.error("ANIA voice request failed", { description: readableError(error) });
        dispatch({ type: "RESET" });
      });
    };
    try {
      recorder.start(250);
    } catch (error) {
      recordingClaimRef.current = false;
      recorderRef.current = null;
      throw error;
    }

    const context = audioContextRef.current;
    const analyser = context?.createAnalyser();
    if (!context || !analyser) {
      if (recorder.state !== "inactive") recorder.stop();
      return;
    }
    analyser.fftSize = 1024;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const startedAt = performance.now();
    let heardSpeech = false;
    let silentSince: number | null = null;
    const stopRecorder = () => {
      source.disconnect();
      analyser.disconnect();
      recorder.stop();
    };
    const monitor = () => {
      if (recorder.state !== "recording") return;
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
      const now = performance.now();
      if (rms >= SILENCE_THRESHOLD) {
        heardSpeech = true;
        silentSince = null;
      } else if (heardSpeech) {
        silentSince ??= now;
      }

      const decision = getRecordingDecision({
        elapsedMs: now - startedAt,
        heardSpeech,
        retryAttempt,
        trailingSilenceMs: silentSince === null ? 0 : now - silentSince,
      });
      if (now - startedAt >= MAX_RECORDING_MS || decision === "process") {
        stopReason = "process";
        stopRecorder();
        return;
      }
      if (decision === "ask_again" || decision === "return_to_wake") {
        stopReason = decision;
        stopRecorder();
        return;
      }
      silenceFrameRef.current = requestAnimationFrame(monitor);
    };
    silenceFrameRef.current = requestAnimationFrame(monitor);
  }, [processRecording, speak, stopRecordingMonitor]);

  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  const scheduleWakeReconnect = useCallback((operation: number, initiallyEnabled = false) => {
    const reconnect = () => {
      const preferred = !isVoiceExplicitlyDisabled(localStorage.getItem(PREFERENCE_KEY));
      if (
        !shouldReconnectWakeSocket({
          enabled: initiallyEnabled || stateRef.current.enabled,
          preferred,
          operationMatches: operationRef.current === operation,
        })
      ) {
        return;
      }

      const delay = reconnectDelayMs(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        void connectWakeSocketRef.current?.(operation).catch(reconnect);
      }, delay);
    };
    reconnect();
  }, []);

  const connectWakeSocket = useCallback(
    async (operation: number) => {
      const tokenResponse = await fetch("/api/voice/wake-token", { method: "POST" });
      const tokenPayload = (await tokenResponse.json().catch(() => null)) as
        | { token?: string; error?: string }
        | null;
      if (!tokenResponse.ok || !tokenPayload?.token) {
        throw new Error(tokenPayload?.error ?? "Wake-word authorization failed.");
      }
      if (operationRef.current !== operation) return;

      const socket = new WebSocket(config.wakeWordWsUrl, ["ania", tokenPayload.token]);
      socketRef.current = socket;
      socket.binaryType = "arraybuffer";
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timeout);
          socket.onopen = null;
          socket.onerror = null;
          socket.onclose = null;
        };
        const timeout = setTimeout(() => {
          cleanup();
          socket.close();
          reject(new Error("ANIA wake-word connection timed out."));
        }, WAKE_SOCKET_CONNECT_TIMEOUT_MS);
        socket.onopen = () => {
          cleanup();
          resolve();
        };
        socket.onerror = () => {
          cleanup();
          reject(new Error("ANIA could not connect to wake-word detection."));
        };
        socket.onclose = () => {
          cleanup();
          reject(new Error("ANIA wake-word connection closed before it was ready."));
        };
      });
      if (operationRef.current !== operation) {
        socket.close();
        return;
      }

      reconnectAttemptRef.current = 0;
      dispatch({ type: "WAKE_CONNECTED" });
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { type?: string };
          if (message.type === "wake_detected") startRecording();
          if (message.type === "sleep_detected") {
            cancelCommandRef.current?.();
            onSleepRef.current?.();
          }
        } catch {
          // Ignore malformed sidecar messages; the authenticated socket remains usable.
        }
      };
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (operationRef.current === operation && stateRef.current.enabled) {
          dispatch({ type: "WAKE_DISCONNECTED" });
        }
        scheduleWakeReconnect(operation);
      };
    },
    [config.wakeWordWsUrl, scheduleWakeReconnect, startRecording],
  );

  useEffect(() => {
    connectWakeSocketRef.current = connectWakeSocket;
  }, [connectWakeSocket]);

  const enable = useCallback(async () => {
    if (enablingRef.current || stateRef.current.enabled) return;
    enablingRef.current = true;
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      if (!config.enabled) {
        throw new Error("ANIA is disabled by the server.");
      }
      if (!config.wakeWordWsUrl) {
        throw new Error("ANIA wake-word service URL is not configured.");
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support ANIA voice mode.");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (operationRef.current !== operation) return;
      streamRef.current = stream;
      context = new AudioContext();
      audioContextRef.current = context;
      await context.resume();
      if (operationRef.current !== operation) return;

      const activeContext = context;
      const source = activeContext.createMediaStreamSource(stream);
      const processor = activeContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        const activeSocket = socketRef.current;
        if (
          activeSocket?.readyState !== WebSocket.OPEN ||
          stateRef.current.status !== "listening_for_wake_word"
        ) {
          return;
        }
        const samples = downsampleTo16Khz(
          event.inputBuffer.getChannelData(0),
          activeContext.sampleRate,
        );
        activeSocket.send(floatToPcm16(samples));
      };
      source.connect(processor);
      processor.connect(activeContext.destination);
      enablingRef.current = false;
      dispatch({ type: "ENABLE_CONNECTING" });
      try {
        await connectWakeSocket(operation);
      } catch {
        if (operationRef.current !== operation) return;
        scheduleWakeReconnect(operation, true);
      }
      if (operationRef.current !== operation) return;
      void loadKokoro().catch(() => {
        // Retry lazily when speech is actually requested.
      });
    } catch (error) {
      if (operationRef.current === operation) stopResources();
      throw error;
    } finally {
      enablingRef.current = false;
      if (operationRef.current !== operation) {
        void context?.close();
        stream?.getTracks().forEach((track) => track.stop());
      }
    }
  }, [
    config.enabled,
    config.wakeWordWsUrl,
    connectWakeSocket,
    loadKokoro,
    scheduleWakeReconnect,
    stopResources,
  ]);

  const disable = useCallback(() => {
    stopResources();
    dispatch({ type: "DISABLE" });
  }, [stopResources]);

  const toggle = useCallback(() => {
    if (stateRef.current.enabled || enablingRef.current) {
      explicitlyDisabledRef.current = true;
      localStorage.setItem(PREFERENCE_KEY, "false");
      disable();
      return;
    }
    explicitlyDisabledRef.current = false;
    localStorage.setItem(PREFERENCE_KEY, "true");
    void enable().catch((error) => {
      stopResources();
      dispatch({ type: "DISABLE" });
      toast.error("Could not enable ANIA", { description: readableError(error) });
    });
  }, [disable, enable, stopResources]);

  useEffect(() => {
    explicitlyDisabledRef.current = isVoiceExplicitlyDisabled(
      localStorage.getItem(PREFERENCE_KEY),
    );
    if (
      shouldAutoEnableVoice({
        configured: config.enabled,
        explicitlyDisabled: explicitlyDisabledRef.current,
      })
    ) {
      void enable().catch((error) => {
        toast.error("ANIA needs microphone access", { description: readableError(error) });
      });
    }
    return stopResources;
  }, [config.enabled, enable, stopResources]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [toggle]);

  return {
    enabled: state.enabled,
    status: state.status,
    statusLabel: getVoiceStatusLabel(state.status),
    toggle,
  };
}
