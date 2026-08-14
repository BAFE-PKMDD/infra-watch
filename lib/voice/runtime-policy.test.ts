import assert from "node:assert/strict";
import test from "node:test";
import {
  getKokoroInferenceOptions,
  getRecordingDecision,
  canStartVoiceRecording,
  isSleepCommand,
  isVoiceExplicitlyDisabled,
  reconnectDelayMs,
  shouldStartConversationalFollowup,
  shouldAutoEnableVoice,
  shouldReconnectWakeSocket,
} from "./runtime-policy";

test("reconnects wake listening after an unexpected socket close", () => {
  assert.equal(
    shouldReconnectWakeSocket({
      enabled: true,
      preferred: true,
      operationMatches: true,
    }),
    true,
  );
});

test("does not reconnect after disable, opt-out, or stale operation", () => {
  assert.equal(
    shouldReconnectWakeSocket({ enabled: false, preferred: true, operationMatches: true }),
    false,
  );
  assert.equal(
    shouldReconnectWakeSocket({ enabled: true, preferred: false, operationMatches: true }),
    false,
  );
  assert.equal(
    shouldReconnectWakeSocket({ enabled: true, preferred: true, operationMatches: false }),
    false,
  );
});

test("uses bounded exponential wake reconnect backoff", () => {
  assert.deepEqual([0, 1, 2, 8].map(reconnectDelayMs), [500, 1_000, 2_000, 10_000]);
});

test("uses stable WASM inference for Kokoro without mixed provider warnings", () => {
  assert.deepEqual(getKokoroInferenceOptions(), {
    dtype: "q8",
    device: "wasm",
  });
});

test("automatically enables voice whenever the exact-admin feature is mounted", () => {
  assert.equal(shouldAutoEnableVoice({ configured: true, explicitlyDisabled: false }), true);
  assert.equal(shouldAutoEnableVoice({ configured: false, explicitlyDisabled: false }), false);
  assert.equal(shouldAutoEnableVoice({ configured: true, explicitlyDisabled: true }), false);
});

test("preserves only an explicit persisted voice opt-out across reloads", () => {
  assert.equal(isVoiceExplicitlyDisabled("false"), true);
  assert.equal(isVoiceExplicitlyDisabled("true"), false);
  assert.equal(isVoiceExplicitlyDisabled(null), false);
});

test("synchronously rejects duplicate recorder ownership", () => {
  assert.equal(
    canStartVoiceRecording({ hasStream: true, recordingClaimed: false, recorderActive: false }),
    true,
  );
  assert.equal(
    canStartVoiceRecording({ hasStream: true, recordingClaimed: true, recorderActive: false }),
    false,
  );
  assert.equal(
    canStartVoiceRecording({ hasStream: true, recordingClaimed: false, recorderActive: true }),
    false,
  );
});

test("recognizes only explicit ANIA sleep commands", () => {
  for (const command of [
    "ANIA sleep",
    "Sleep, ANIA.",
    "Anya, go to sleep",
    "Hey ANIA please sleep",
  ]) {
    assert.equal(isSleepCommand(command), true, command);
  }
  for (const command of [
    "Show sleeping projects",
    "Does ANIA sleep?",
    "Explain sleep mode",
    "Go to the sleep report",
  ]) {
    assert.equal(isSleepCommand(command), false, command);
  }
});

test("opens exactly one quiet conversational follow-up window", () => {
  assert.equal(
    shouldStartConversationalFollowup({
      enabled: true,
      operationMatches: true,
      alreadyFollowup: false,
    }),
    true,
  );
  for (const context of [
    { enabled: false, operationMatches: true, alreadyFollowup: false },
    { enabled: true, operationMatches: false, alreadyFollowup: false },
    { enabled: true, operationMatches: true, alreadyFollowup: true },
  ]) {
    assert.equal(shouldStartConversationalFollowup(context), false);
  }
});

test("asks once after five seconds of no speech, then returns to wake listening", () => {
  assert.equal(
    getRecordingDecision({ elapsedMs: 4_999, heardSpeech: false, retryAttempt: 0 }),
    "continue",
  );
  assert.equal(
    getRecordingDecision({ elapsedMs: 5_000, heardSpeech: false, retryAttempt: 0 }),
    "ask_again",
  );
  assert.equal(
    getRecordingDecision({ elapsedMs: 5_000, heardSpeech: false, retryAttempt: 1 }),
    "return_to_wake",
  );
});

test("ends a spoken command after trailing silence instead of the initial five-second wait", () => {
  assert.equal(
    getRecordingDecision({
      elapsedMs: 2_000,
      heardSpeech: true,
      retryAttempt: 0,
      trailingSilenceMs: 1_199,
    }),
    "continue",
  );
  assert.equal(
    getRecordingDecision({
      elapsedMs: 2_000,
      heardSpeech: true,
      retryAttempt: 0,
      trailingSilenceMs: 1_200,
    }),
    "process",
  );
});
