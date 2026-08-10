import assert from "node:assert/strict";
import test from "node:test";
import { getTableColumns } from "drizzle-orm";

import { chatHistory } from "./db/schema";
import {
  getChatHistoryExpiry,
  getChatHistoryFailureStatus,
} from "./chat-history";

test("chat history schema stores analyzable turns without network identifiers", () => {
  const columns = getTableColumns(chatHistory);

  for (const requiredColumn of [
    "conversationId",
    "ownerKey",
    "userId",
    "userMessage",
    "assistantMessage",
    "status",
    "provider",
    "model",
    "toolNames",
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "durationMs",
    "finishReason",
    "errorCode",
    "expiresAt",
    "createdAt",
    "updatedAt",
  ]) {
    assert.ok(requiredColumn in columns, `missing ${requiredColumn}`);
  }

  assert.equal("ipAddress" in columns, false);
  assert.equal("userAgent" in columns, false);
});

test("chat history expiry uses a bounded retention period", () => {
  const now = new Date("2026-08-09T00:00:00.000Z");
  assert.equal(
    getChatHistoryExpiry(now, "30").toISOString(),
    "2026-09-08T00:00:00.000Z",
  );
  assert.equal(
    getChatHistoryExpiry(now, "9999").toISOString(),
    "2027-08-09T00:00:00.000Z",
  );
});

test("classifies cancellation and timeout separately from failures", () => {
  assert.equal(getChatHistoryFailureStatus("request_aborted"), "aborted");
  assert.equal(getChatHistoryFailureStatus("response_timeout"), "timed_out");
  assert.equal(getChatHistoryFailureStatus("provider_stream_failed"), "failed");
});
