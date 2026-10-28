import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  ADMIN_CHAT_TIMEOUT_MS,
  FILTERED_ANSWER_NOTICE,
  TRUNCATED_ANSWER_NOTICE,
  getAdminChatResponseTimeoutMs,
  getAiThinkingBudget,
  getGenerationProviderOptions,
  getIncompleteAnswerNotice,
} from "./chat-generation";

test("admin responses get a longer, bounded timeout than the public surface", () => {
  assert.equal(getAdminChatResponseTimeoutMs(undefined), ADMIN_CHAT_TIMEOUT_MS);
  assert.ok(ADMIN_CHAT_TIMEOUT_MS > 55_000);
  assert.equal(getAdminChatResponseTimeoutMs("500"), 1_000);
  assert.equal(getAdminChatResponseTimeoutMs("900000"), 110_000);
  assert.equal(getAdminChatResponseTimeoutMs("not-a-number"), ADMIN_CHAT_TIMEOUT_MS);
});

test("hidden reasoning is capped for Gemini so it cannot consume the answer budget", () => {
  assert.equal(getAiThinkingBudget(undefined), 1_024);
  assert.equal(getAiThinkingBudget("0"), 0);
  assert.equal(getAiThinkingBudget("-5"), 0);
  assert.equal(getAiThinkingBudget("999999"), 8_192);
  assert.deepEqual(getGenerationProviderOptions("google", 512), {
    google: { thinkingConfig: { thinkingBudget: 512 } },
  });
  assert.deepEqual(getGenerationProviderOptions("gemini", 512), {
    google: { thinkingConfig: { thinkingBudget: 512 } },
  });
  assert.equal(getGenerationProviderOptions("openai"), undefined);
  assert.equal(getGenerationProviderOptions("anthropic"), undefined);
});

test("only incomplete finish reasons produce a user-facing notice", () => {
  assert.equal(getIncompleteAnswerNotice("length"), TRUNCATED_ANSWER_NOTICE);
  assert.equal(getIncompleteAnswerNotice("content-filter"), FILTERED_ANSWER_NOTICE);
  assert.equal(getIncompleteAnswerNotice("stop"), null);
  assert.equal(getIncompleteAnswerNotice("tool-calls"), null);
  assert.equal(getIncompleteAnswerNotice(undefined), null);
  assert.match(TRUNCATED_ANSWER_NOTICE, /continue/i);
});
