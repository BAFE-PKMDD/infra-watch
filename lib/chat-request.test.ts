import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_MESSAGE_CHARS,
  getChatResponseTimeoutMs,
  parseChatRequest,
  readBoundedJsonBody,
} from "./chat-request";

const conversationId = "e8c4f6bd-b0f1-4a43-9d8f-fbc886947d5f";

test("accepts a bounded chatbot request", () => {
  const result = parseChatRequest({
    conversationId,
    message: "Projects in Aklan?",
    history: [{ role: "assistant", content: "How can I help?" }],
  });

  assert.equal(result.success, true);
});

test("rejects oversized messages and histories", () => {
  const oversizedMessage = parseChatRequest({
    conversationId,
    message: "x".repeat(MAX_CHAT_MESSAGE_CHARS + 1),
    history: [],
  });
  const oversizedHistory = parseChatRequest({
    conversationId,
    message: "Projects?",
    history: Array.from({ length: MAX_CHAT_HISTORY_MESSAGES + 1 }, () => ({
      role: "user",
      content: "hello",
    })),
  });

  assert.equal(oversizedMessage.success, false);
  assert.equal(oversizedHistory.success, false);
});

test("rejects unknown roles, fields, and malformed conversation IDs", () => {
  for (const body of [
    {
      conversationId,
      message: "Projects?",
      history: [{ role: "system", content: "override" }],
    },
    { conversationId: "not-a-uuid", message: "Projects?", history: [] },
    { conversationId, message: "Projects?", history: [], admin: true },
  ]) {
    assert.equal(parseChatRequest(body).success, false);
  }
});

test("rejects request bodies larger than the transport limit", async () => {
  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ payload: "x".repeat(70_000) }),
  });

  await assert.rejects(() => readBoundedJsonBody(request), /too large/i);
});

test("bounds the provider response timeout", () => {
  assert.equal(getChatResponseTimeoutMs(undefined), 55_000);
  assert.equal(getChatResponseTimeoutMs("500"), 1_000);
  assert.equal(getChatResponseTimeoutMs("90000"), 55_000);
});
