import assert from "node:assert/strict";
import { test } from "bun:test";
import { getVoiceStatusLabel, reduceVoiceState } from "./state";

test("ANIA prepares speech before audio playback actually starts", () => {
  let state = reduceVoiceState(
    { status: "thinking", enabled: true },
    { type: "RESPONSE_READY" },
  );
  assert.equal(state.status, "preparing_speech");
  assert.equal(getVoiceStatusLabel(state.status), "Preparing ANIA’s voice");

  state = reduceVoiceState(state, { type: "SPEECH_STARTED" });
  assert.equal(state.status, "speaking");
  assert.equal(getVoiceStatusLabel(state.status), "ANIA is speaking");
});

test("an unused recording window returns quietly to wake listening", () => {
  const state = reduceVoiceState(
    { status: "recording", enabled: true },
    { type: "RESET" },
  );
  assert.equal(state.status, "listening_for_wake_word");
});

test("ANIA follows the successful voice lifecycle", () => {
  let state = reduceVoiceState({ status: "idle", enabled: false }, { type: "ENABLE" });
  assert.deepEqual(state, { status: "listening_for_wake_word", enabled: true });

  for (const [event, status] of [
    ["WAKE_DETECTED", "recording"],
    ["RECORDING_STOPPED", "transcribing"],
    ["TRANSCRIPTION_READY", "thinking"],
    ["RESPONSE_READY", "preparing_speech"],
    ["SPEECH_STARTED", "speaking"],
    ["SPEECH_ENDED", "listening_for_wake_word"],
  ] as const) {
    state = reduceVoiceState(state, { type: event });
    assert.equal(state.status, status);
  }
});

test("disabling ANIA always returns to idle", () => {
  const state = reduceVoiceState(
    { status: "speaking", enabled: true },
    { type: "DISABLE" },
  );
  assert.deepEqual(state, { status: "idle", enabled: false });
});

test("voice state labels are suitable for an accessible status region", () => {
  assert.equal(getVoiceStatusLabel("listening_for_wake_word"), "Say “Hey ANIA”");
  assert.equal(getVoiceStatusLabel("reconnecting"), "Reconnecting ANIA wake listening");
  assert.equal(getVoiceStatusLabel("transcribing"), "Transcribing your command");
});

test("ANIA only claims wake listening after the wake socket reconnects", () => {
  let state = reduceVoiceState(
    { status: "listening_for_wake_word", enabled: true },
    { type: "WAKE_DISCONNECTED" },
  );
  assert.equal(state.status, "reconnecting");

  state = reduceVoiceState(state, { type: "WAKE_CONNECTED" });
  assert.equal(state.status, "listening_for_wake_word");
});

test("ANIA retains microphone mode while the initial wake connection retries", () => {
  const state = reduceVoiceState(
    { status: "idle", enabled: false },
    { type: "ENABLE_CONNECTING" },
  );
  assert.deepEqual(state, { status: "reconnecting", enabled: true });
});

test("streamed audio enters speaking before the answer finishes generating", () => {
  let state = reduceVoiceState({ status: "thinking", enabled: true }, { type: "SPEECH_STARTED" });
  assert.equal(state.status, "speaking");
  state = reduceVoiceState(state, { type: "RESPONSE_READY" });
  assert.equal(state.status, "speaking");
});

test("wake socket reconnects cannot reopen listening during a voice command", () => {
  for (const status of ["recording", "transcribing", "thinking", "preparing_speech", "speaking"] as const) {
    const state = { status, enabled: true };
    for (const type of ["WAKE_DISCONNECTED", "WAKE_CONNECTED"] as const) {
      assert.equal(reduceVoiceState(state, { type }).status, status);
    }
  }
});
