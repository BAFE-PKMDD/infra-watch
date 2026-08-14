export type VoiceAssistantStatus =
  | "idle"
  | "reconnecting"
  | "listening_for_wake_word"
  | "recording"
  | "transcribing"
  | "thinking"
  | "preparing_speech"
  | "speaking";

export type VoiceAssistantState = {
  status: VoiceAssistantStatus;
  enabled: boolean;
};

export type VoiceAssistantEvent =
  | { type: "ENABLE_CONNECTING" }
  | { type: "ENABLE" }
  | { type: "DISABLE" }
  | { type: "WAKE_CONNECTED" }
  | { type: "WAKE_DISCONNECTED" }
  | { type: "WAKE_DETECTED" }
  | { type: "RETRY_REQUESTED" }
  | { type: "RETRY_LISTENING" }
  | { type: "RECORDING_STOPPED" }
  | { type: "TRANSCRIPTION_READY" }
  | { type: "RESPONSE_READY" }
  | { type: "SPEECH_STARTED" }
  | { type: "SPEECH_ENDED" }
  | { type: "RESET" };

export function reduceVoiceState(
  state: VoiceAssistantState,
  event: VoiceAssistantEvent,
): VoiceAssistantState {
  if (event.type === "DISABLE") return { status: "idle", enabled: false };
  if (event.type === "ENABLE_CONNECTING") {
    return { status: "reconnecting", enabled: true };
  }
  if (event.type === "ENABLE") {
    return { status: "listening_for_wake_word", enabled: true };
  }
  if (event.type === "WAKE_DISCONNECTED" && state.enabled) {
    return { ...state, status: "reconnecting" };
  }
  if (event.type === "WAKE_CONNECTED" && state.enabled) {
    return { ...state, status: "listening_for_wake_word" };
  }
  if (event.type === "RESET") {
    return {
      status: state.enabled ? "listening_for_wake_word" : "idle",
      enabled: state.enabled,
    };
  }

  const transitions: Partial<
    Record<VoiceAssistantStatus, Partial<Record<VoiceAssistantEvent["type"], VoiceAssistantStatus>>>
  > = {
    reconnecting: { WAKE_CONNECTED: "listening_for_wake_word" },
    listening_for_wake_word: { WAKE_DETECTED: "recording" },
    recording: {
      RECORDING_STOPPED: "transcribing",
      RETRY_REQUESTED: "preparing_speech",
    },
    transcribing: { TRANSCRIPTION_READY: "thinking" },
    thinking: { RESPONSE_READY: "preparing_speech" },
    preparing_speech: { SPEECH_STARTED: "speaking" },
    speaking: {
      SPEECH_ENDED: "listening_for_wake_word",
      RETRY_LISTENING: "recording",
    },
  };
  const nextStatus = transitions[state.status]?.[event.type];
  return nextStatus ? { ...state, status: nextStatus } : state;
}

const STATUS_LABELS: Record<VoiceAssistantStatus, string> = {
  idle: "Voice mode is off",
  reconnecting: "Reconnecting ANIA wake listening",
  listening_for_wake_word: "Say “Hey ANIA”",
  recording: "Listening to your command",
  transcribing: "Transcribing your command",
  thinking: "ANIA is thinking",
  preparing_speech: "Preparing ANIA’s voice",
  speaking: "ANIA is speaking",
};

export function getVoiceStatusLabel(status: VoiceAssistantStatus) {
  return STATUS_LABELS[status];
}
