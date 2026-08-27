import assert from "node:assert/strict";
import test from "node:test";
import {
  SPEECH_SUMMARY_MAX_CHARS,
  SPEECH_SUMMARY_NOTICE,
  VOICE_MAX_OUTPUT_TOKENS,
  VOICE_RESPONSE_INSTRUCTION,
  clearOwnedPlaybackSettlement,
  createSpokenBudget,
  createStreamingSpeechRunner,
  extractCompleteSentences,
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
  summarizeForSpeech,
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

test("summarizes long spoken answers at a sentence boundary with a notice", () => {
  const sentences = [
    "The Greenhouse Production Facility in Alfonso Castaneda, Nueva Vizcaya is contracted to Vera Equinox Technologies Incorporated with a budget of around 2.43 million pesos.",
    "The Goat House construction in Cabanglasan, Bukidnon is contracted to We Fix Construction Services Incorporated with a budget of 1.7 million pesos.",
    "Another Goat House construction in Damulog, Bukidnon is also handled by We Fix Construction Services Incorporated.",
    "The Feed Mill establishment in Ma-Ayon, Capiz is still pending review.",
  ];
  const answer = sentences.join(" ");
  const summary = summarizeForSpeech(answer);

  assert.ok(answer.length > SPEECH_SUMMARY_MAX_CHARS);
  assert.ok(summary.length < answer.length);
  assert.ok(summary.startsWith(sentences[0]));
  assert.ok(summary.includes(sentences[1]));
  assert.ok(!summary.includes("Damulog"));
  assert.ok(summary.endsWith(SPEECH_SUMMARY_NOTICE));
  const content = summary.slice(0, summary.length - SPEECH_SUMMARY_NOTICE.length - 1);
  assert.ok(content.length <= SPEECH_SUMMARY_MAX_CHARS);
});

test("keeps short spoken answers intact without the summary notice", () => {
  const short = "**Three projects match.** [Open the list](/projects)";
  assert.equal(summarizeForSpeech(short), "Three projects match. Open the list");
});

test("hard-truncates an overlong unpunctuated answer at a word boundary", () => {
  const runOn = Array.from({ length: 120 }, (_, index) => `project${index + 1}`).join(" ");
  const summary = summarizeForSpeech(runOn);

  assert.ok(runOn.length > SPEECH_SUMMARY_MAX_CHARS);
  assert.ok(summary.startsWith(`project1 project2 project3`));
  assert.ok(summary.includes("…"));
  assert.ok(summary.endsWith(SPEECH_SUMMARY_NOTICE));
  const content = summary.slice(0, summary.length - SPEECH_SUMMARY_NOTICE.length - 1);
  assert.ok(content.length <= SPEECH_SUMMARY_MAX_CHARS + 1);
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
    dtype: "q4",
    device: "wasm",
  });
});

test("extracts complete sentences from streamed deltas", () => {
  assert.deepEqual(extractCompleteSentences("Hello there. How are"), {
    sentences: ["Hello there."],
    rest: "How are",
  });
  assert.deepEqual(extractCompleteSentences("Progress is 99.5 percent"), {
    sentences: [],
    rest: "Progress is 99.5 percent",
  });
  assert.deepEqual(extractCompleteSentences("Done!"), {
    sentences: ["Done!"],
    rest: "",
  });
});

test("spoken budget keeps fitting sentences and drops the first overflow", () => {
  const budget = createSpokenBudget(30);
  assert.equal(budget.take("Short one."), "Short one.");
  assert.equal(budget.take("This sentence is far too long to fit"), null);
});

test("spoken budget hard-truncates an overlong first sentence", () => {
  const budget = createSpokenBudget(40);
  const piece = budget.take(`${"A".repeat(50)} tail.`);
  assert.ok(piece);
  assert.equal(piece.length, 41);
  assert.ok(piece.endsWith("…"));
  assert.equal(budget.take("Short."), null);
});

test("synthesizes the next streamed sentence while the current one plays", async () => {
  const events: string[] = [];
  let resolveFirst: (value: string) => void = () => undefined;
  let releaseFirst: (() => void) | null = null;
  const runner = createStreamingSpeechRunner({
    generate: (chunk) => {
      events.push(`generate:${chunk}`);
      if (chunk === "First.") {
        return new Promise<string>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(chunk);
    },
    play: async (audio) => {
      events.push(`play-start:${audio}`);
      if (audio === "First.") {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      events.push(`play-end:${audio}`);
      return true;
    },
    shouldContinue: () => true,
  });

  runner.push("First. Second.");
  await new Promise((resolve) => setTimeout(resolve, 0));
  resolveFirst("First.");
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(events.includes("generate:First."));
  assert.ok(events.includes("play-start:First."));
  assert.ok(
    events.includes("generate:Second."),
    "next synthesis must start during current playback",
  );
  assert.ok(!events.includes("play-end:First."));

  (releaseFirst as (() => void) | null)?.();
  const completed = await runner.end();
  assert.equal(completed, true);
  assert.ok(
    events.indexOf("play-start:Second.") > events.indexOf("play-end:First."),
  );
  assert.ok(events.includes("play-end:Second."));
});

test("caps streamed speech at the budget and appends the summary notice", async () => {
  const spoken: string[] = [];
  const runner = createStreamingSpeechRunner({
    generate: async (chunk) => chunk,
    play: async (audio) => {
      spoken.push(audio);
      return true;
    },
    shouldContinue: () => true,
    maxChars: 60,
  });

  runner.push("First short sentence. Second short sentence. ");
  runner.push("Third sentence pushes past the limit. Fourth.");
  const completed = await runner.end();

  assert.equal(completed, true);
  assert.deepEqual(spoken, [
    "First short sentence.",
    "Second short sentence.",
    SPEECH_SUMMARY_NOTICE,
  ]);
});

test("propagates streaming synthesis failures through end", async () => {
  const runner = createStreamingSpeechRunner({
    generate: async (chunk) => {
      if (chunk === "Bad.") throw new Error("boom");
      return chunk;
    },
    play: async () => true,
    shouldContinue: () => true,
  });

  runner.push("Bad. Unheard.");
  await assert.rejects(runner.end(), /boom/);
});

test("stops streamed speech when the operation is superseded", async () => {
  let current = true;
  const played: string[] = [];
  const runner = createStreamingSpeechRunner({
    generate: async (chunk) => chunk,
    play: async (audio) => {
      played.push(audio);
      return current;
    },
    shouldContinue: () => current,
  });

  runner.push("One. Two. Three.");
  current = false;
  assert.equal(await runner.end(), false);
  assert.deepEqual(played, []);
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
