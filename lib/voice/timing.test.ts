import assert from "node:assert/strict";
import { test } from "bun:test";
import { createVoiceTurnTimer, parseServerTimingMs } from "./timing";

test("reports cumulative and per-stage latency, counting only the first mark", () => {
  let clock = 1_000;
  const timer = createVoiceTurnTimer(() => clock);

  timer.mark("recording_stopped");
  clock += 900;
  timer.mark("transcript_ready");
  clock += 600;
  timer.mark("first_token");
  clock += 50;
  timer.mark("first_token");
  clock += 400;
  timer.mark("first_audio");
  timer.setServerTranscribeMs(812);

  assert.deepEqual(timer.report(), {
    stages: {
      recording_stopped: 0,
      transcript_ready: 900,
      first_token: 1_500,
      first_audio: 1_950,
    },
    gaps: {
      recording_stopped: 0,
      transcript_ready: 900,
      first_token: 600,
      first_audio: 450,
    },
    serverTranscribeMs: 812,
  });
});

test("parses a named Server-Timing duration", () => {
  assert.equal(parseServerTimingMs("auth;dur=3.5, whisper;dur=812.25", "whisper"), 812.25);
  assert.equal(parseServerTimingMs("auth;dur=3.5", "whisper"), undefined);
  assert.equal(parseServerTimingMs(null, "whisper"), undefined);
  assert.equal(parseServerTimingMs("whisper;dur=abc", "whisper"), undefined);
});
