import assert from "node:assert/strict";
import test from "node:test";
import {
  VOICE_MAX_OUTPUT_TOKENS,
  VOICE_RESPONSE_INSTRUCTION,
  clearOwnedPlaybackSettlement,
  getKokoroInferenceOptions,
  getRecordingDecision,
  canStartVoiceRecording,
  isSleepCommand,
  isVoiceExplicitlyDisabled,
  prepareSpeechChunks,
  runSpeechChunkPipeline,
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

test("allows complete voice answers without the former 180-token truncation", () => {
  assert.ok(VOICE_MAX_OUTPUT_TOKENS >= 512);
  assert.match(VOICE_RESPONSE_INSTRUCTION, /complete answer/i);
  assert.doesNotMatch(VOICE_RESPONSE_INSTRUCTION, /at most three short sentences/i);
});

test("chunks cleaned speech by sentence for faster first audio", () => {
  assert.deepEqual(
    prepareSpeechChunks(
      "**Three projects match.** First project is in Aklan. [Open it](/projects/1)",
    ),
    ["Three projects match.", "First project is in Aklan.", "Open it"],
  );
});

test("keeps decimal values intact while splitting speech", () => {
  assert.deepEqual(prepareSpeechChunks("Progress is 99.5 percent. Three projects remain."), [
    "Progress is 99.5 percent.",
    "Three projects remain.",
  ]);
});

test("bounds long speech chunks without dropping words", () => {
  const speech = Array.from({ length: 80 }, (_, index) => `project${index + 1}`).join(" ");
  const chunks = prepareSpeechChunks(speech, 80);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 80));
  assert.equal(chunks.join(" "), speech);
});

test("does not silently truncate a bounded voice answer", () => {
  const speech = Array.from({ length: 350 }, (_, index) => `project-${index + 1}`).join(" ");
  assert.ok(speech.length > 2_000);
  assert.equal(prepareSpeechChunks(speech).join(" "), speech);
});

test("prefetches the next sentence only after first audio starts", async () => {
  const events: string[] = [];
  const completed = await runSpeechChunkPipeline({
    chunks: ["first", "second"],
    generate: async (chunk) => {
      events.push(`generate:${chunk}`);
      return chunk;
    },
    play: async (audio, onStarted) => {
      events.push(`play-start:${audio}`);
      onStarted();
      await Promise.resolve();
      events.push(`play-end:${audio}`);
      return true;
    },
    shouldContinue: () => true,
  });

  assert.equal(completed, true);
  assert.deepEqual(events, [
    "generate:first",
    "play-start:first",
    "generate:second",
    "play-end:first",
    "play-start:second",
    "play-end:second",
  ]);
});

test("propagates every synthesis rejection including falsy reasons", async () => {
  for (const reason of [undefined, null, false]) {
    let threw = false;
    try {
      await runSpeechChunkPipeline({
        chunks: ["first"],
        generate: () => Promise.reject(reason),
        play: async () => true,
        shouldContinue: () => true,
      });
    } catch (error) {
      threw = true;
      assert.equal(error, reason);
    }
    assert.equal(threw, true);
  }
});

test("an old playback cannot clear a newer playback settlement", () => {
  const oldSettlement = () => undefined;
  const newSettlement = () => undefined;
  const settlementRef = { current: newSettlement as (() => void) | null };

  clearOwnedPlaybackSettlement(settlementRef, oldSettlement);
  assert.equal(settlementRef.current, newSettlement);
  clearOwnedPlaybackSettlement(settlementRef, newSettlement);
  assert.equal(settlementRef.current, null);
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
