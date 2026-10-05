import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "bun:test";
import ts from "typescript";
import * as policy from "../lib/voice/runtime-policy";
import * as voiceState from "../lib/voice/state";
import type { useVoiceAssistant } from "./use-voice-assistant";

const hookCode = ts.transpileModule(
  readFileSync(new URL("./use-voice-assistant.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

// Run the real hook with controllable browser audio and deferred React renders.
// This exercises socket/recorder/timer races without microphone hardware.
function createHarness(transcriptionStatus = 200) {
  let now = 0;
  let rms = 0;
  let nextId = 0;
  let state: voiceState.VoiceAssistantState = { enabled: false, status: "idle" };
  const effects: Array<() => unknown> = [];
  const frames = new Map<number, () => void>();
  const timers = new Map<number, { at: number; callback: () => void }>();
  const requests: string[] = [];
  const transcripts: string[] = [];
  const submissions: string[] = [];
  const errors: unknown[] = [];
  let cancellations = 0;
  const preference = new Map<string, string>();
  let finishAnswer: (() => void) | undefined;

  class Socket {
    static OPEN = 1;
    readyState = 1;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    sent: unknown[] = [];
    constructor() {
      sockets.push(this);
      queueMicrotask(() => this.onopen?.());
    }
    send(data: unknown) { this.sent.push(data); }
    close() { this.readyState = 3; this.onclose?.(); }
    wake() { this.onmessage?.({ data: JSON.stringify({ type: "wake_detected" }) }); }
  }
  const sockets: Socket[] = [];

  class Recorder {
    static isTypeSupported() { return true; }
    state = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { recorders.push(this); }
    start() { this.state = "recording"; }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["recorded audio"]) });
      this.onstop?.();
    }
  }
  const recorders: Recorder[] = [];

  class AudioPlayback {
    src = "";
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { audio.push(this); }
    async play() {}
    pause() {}
    end() { this.onended?.(); }
  }
  const audio: AudioPlayback[] = [];
  const node = () => ({ connect() {}, disconnect() {} });
  class AudioContextMock {
    sampleRate = 16_000;
    destination = {};
    audioWorklet = { async addModule() {} };
    async resume() {}
    async close() {}
    createMediaStreamSource() { return node(); }
    createAnalyser() {
      return { ...node(), fftSize: 1024, getFloatTimeDomainData(samples: Float32Array) { samples.fill(rms); } };
    }
  }
  class Worklet {
    port = { onmessage: null as ((event: { data: Float32Array }) => void) | null, close() {} };
    constructor() { worklets.push(this); }
    connect() {}
    disconnect() {}
  }
  const worklets: Worklet[] = [];
  const engine = {
    async preload() {},
    async generate() { return new Blob(["spoken answer"]); },
    isAlive: () => true,
    dispose() {},
  };
  const modules: Record<string, unknown> = {
    react: {
      useRef: (current: unknown) => ({ current }),
      useCallback: (callback: unknown) => callback,
      useEffect: (effect: () => unknown) => effects.push(effect),
      useReducer: () => [state, (event: voiceState.VoiceAssistantEvent) => {
        state = voiceState.reduceVoiceState(state, event);
      }],
    },
    sonner: { toast: { error: (...args: unknown[]) => errors.push(args) } },
    "@/lib/voice/runtime-policy": policy,
    "@/lib/voice/state": voiceState,
    "@/lib/voice/tts-worker-client": { createWorkerSpeechEngine: () => engine },
  };
  const hookModule = { exports: {} as { useVoiceAssistant: typeof useVoiceAssistant } };
  vm.runInNewContext(hookCode, {
    module: hookModule,
    exports: hookModule.exports,
    require: (name: string) => {
      assert.ok(name in modules, `Unexpected module: ${name}`);
      return modules[name];
    },
    Blob, FormData, AbortController, DOMException, Float32Array, Int16Array,
    console,
    performance: { now: () => now },
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    Audio: AudioPlayback,
    AudioContext: AudioContextMock,
    AudioWorkletNode: Worklet,
    MediaRecorder: Recorder,
    WebSocket: Socket,
    navigator: { mediaDevices: { async getUserMedia() { return { getTracks: () => [{ stop() {} }] }; } } },
    localStorage: { getItem: (key: string) => preference.get(key) ?? null, setItem: (key: string, value: string) => preference.set(key, value) },
    window: { addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (callback: () => void) => { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    setTimeout: (callback: () => void, delay = 0) => { const id = ++nextId; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    fetch: async (url: string) => {
      requests.push(url);
      return url.endsWith("wake-token")
        ? Response.json({ token: "test-token" })
        : Response.json(transcriptionStatus === 200
          ? { text: "Show projects in Aklan" }
          : { error: "No speech was detected." }, { status: transcriptionStatus });
    },
  });
  const controller = hookModule.exports.useVoiceAssistant({
    config: { enabled: true, wakeWord: "hey_ania", wakeWordWsUrl: "ws://test/wake", kokoroModel: "test", kokoroVoice: "af_heart" },
    onTranscription: (text) => transcripts.push(text),
    cancelCommand: () => { cancellations++; },
    submitCommand: async (text, delta) => {
      submissions.push(text);
      delta?.("Here are the projects.");
      await new Promise<void>((resolve) => { finishAnswer = resolve; });
      return "Here are the projects.";
    },
  });
  for (const effect of effects) effect();

  const advance = (duration: number, level = 0) => {
    rms = level;
    now += duration;
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback();
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(id); timer.callback(); }
    }
  };
  const recordCommand = () => {
    sockets.at(-1)!.wake();
    for (let index = 0; index < 25; index++) advance(20, 0.05);
    for (let index = 0; index < 61; index++) advance(20);
  };
  return {
    controller, advance, recordCommand, sockets, recorders, worklets, audio,
    requests, transcripts, submissions, errors,
    get state() { return state; },
    get cancellations() { return cancellations; },
    finishAnswer: () => finishAnswer?.(),
  };
}

test("a false wake and microphone click never upload, type, submit, or speak", async () => {
  const harness = createHarness();
  await settle();
  harness.sockets[0].wake();
  harness.sockets[0].wake();
  assert.equal(harness.recorders.length, 1);
  harness.advance(20, 0.3);
  for (let index = 0; index < 250; index++) harness.advance(20);
  await settle();
  assert.equal(harness.state.status, "listening_for_wake_word");
  assert.deepEqual(harness.requests, ["/api/voice/wake-token"]);
  assert.deepEqual(harness.transcripts, []);
  assert.deepEqual(harness.submissions, []);
  assert.equal(harness.audio.length, 0);
  assert.deepEqual(harness.errors, []);
});

test("server-rejected background noise returns quietly without adding chat text", async () => {
  const harness = createHarness(422);
  await settle();
  harness.recordCommand();
  await settle();
  assert.ok(harness.requests.includes("/api/voice/transcribe"));
  assert.equal(harness.state.status, "listening_for_wake_word");
  assert.deepEqual(harness.transcripts, []);
  assert.deepEqual(harness.submissions, []);
  assert.equal(harness.audio.length, 0);
  assert.deepEqual(harness.errors, []);
});

test("streaming playback and a wake reconnect cannot record their own answer", async () => {
  const harness = createHarness();
  await settle();
  harness.recordCommand();
  await settle();
  assert.equal(harness.state.status, "speaking");
  assert.equal(harness.audio.length, 1);
  harness.sockets[0].close();
  harness.advance(500);
  await settle();
  assert.equal(harness.sockets.length, 2);
  assert.equal(harness.state.status, "speaking");
  harness.sockets[1].wake();
  harness.worklets[0].port.onmessage?.({ data: new Float32Array(4096).fill(0.2) });
  assert.equal(harness.recorders.length, 1);
  assert.equal(harness.sockets[1].sent.length, 0);

  harness.finishAnswer();
  harness.audio[0].end();
  await settle();
  harness.advance(policy.VOICE_PLAYBACK_COOLDOWN_MS - 1);
  harness.sockets[1].wake();
  harness.worklets[0].port.onmessage?.({ data: new Float32Array(4096).fill(0.2) });
  assert.equal(harness.recorders.length, 1);
  assert.equal(harness.sockets[1].sent.length, 0);
  harness.advance(1);
  assert.equal(harness.recorders.length, 2);
  assert.equal(harness.state.status, "recording");
  for (let index = 0; index < 250; index++) harness.advance(20);
  await settle();
  assert.equal(harness.state.status, "listening_for_wake_word");
  assert.equal(harness.submissions.length, 1);
  assert.equal(harness.audio.length, 1);
});

test("disabling voice cancels follow-up recording across a new microphone session", async () => {
  const harness = createHarness();
  await settle();
  harness.recordCommand();
  await settle();
  harness.finishAnswer();
  harness.audio[0].end();
  await settle();
  harness.controller.toggle();
  harness.controller.toggle();
  await settle();
  harness.advance(policy.VOICE_PLAYBACK_COOLDOWN_MS);
  assert.equal(harness.state.status, "listening_for_wake_word");
  assert.equal(harness.recorders.length, 1);
});

test("disabling voice during streamed audio cancels the still-generating answer", async () => {
  const harness = createHarness();
  await settle();
  harness.recordCommand();
  await settle();
  assert.equal(harness.state.status, "speaking");
  harness.controller.toggle();
  assert.equal(harness.cancellations, 1);
  harness.finishAnswer();
  await settle();
  harness.advance(5_000);
  assert.equal(harness.state.status, "idle");
  assert.equal(harness.recorders.length, 1);
});
