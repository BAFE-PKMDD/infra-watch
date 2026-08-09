import assert from "node:assert/strict";
import test from "node:test";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import { chatRateLimits } from "./db/schema";
import {
  getChatClientIdentity,
  getChatOwnerKey,
  hashRateLimitIdentity,
} from "./chat-rate-limit";

const conversationId = "e8c4f6bd-b0f1-4a43-9d8f-fbc886947d5f";

test("rate limit schema stores only hashed keys and counters", () => {
  const columns = getTableColumns(chatRateLimits);
  assert.deepEqual(Object.keys(columns).sort(), [
    "key",
    "requestCount",
    "updatedAt",
    "windowStartedAt",
  ]);
});

test("rate limit schema indexes stale-counter cleanup", () => {
  const config = getTableConfig(chatRateLimits);
  const cleanupIndex = config.indexes.find(
    (candidate) => candidate.config.name === "ai_chat_rate_limits_updated_at_idx",
  );

  assert.deepEqual(
    cleanupIndex?.config.columns.map((column) =>
      "name" in column ? column.name : null,
    ),
    ["updated_at"],
  );
});

test("uses authenticated users as the stable rate-limit identity", () => {
  const identity = getChatClientIdentity({
    userId: "user-42",
    conversationId,
    cookieClientId: null,
    trustedProxyIp: null,
  });

  assert.deepEqual(identity, {
    value: "user:user-42",
    clientId: null,
  });
});

test("generates a stable anonymous client ID without trusting forwarded IP by default", () => {
  const identity = getChatClientIdentity({
    userId: null,
    conversationId,
    cookieClientId: null,
    trustedProxyIp: null,
  });

  assert.match(identity.clientId ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(identity.value, `anonymous:${identity.clientId}`);
});

test("uses a trusted proxy IP as the anonymous rate-limit identity", () => {
  const first = getChatClientIdentity({
    userId: null,
    conversationId: "0f702b4a-3456-4789-9abc-0123456789ab",
    cookieClientId: "1f702b4a-3456-4789-9abc-0123456789ab",
    trustedProxyIp: "203.0.113.10",
  });
  const second = getChatClientIdentity({
    userId: null,
    conversationId: "2f702b4a-3456-4789-9abc-0123456789ab",
    cookieClientId: "3f702b4a-3456-4789-9abc-0123456789ab",
    trustedProxyIp: "203.0.113.10",
  });

  assert.equal(first.value, "anonymous:ip:203.0.113.10");
  assert.equal(second.value, first.value);
});

test("hashes rate-limit identities before persistence", () => {
  const hashed = hashRateLimitIdentity("anonymous:private-client", "test-secret");
  assert.match(hashed, /^[a-f0-9]{64}$/);
  assert.equal(hashed.includes("private-client"), false);
});

test("derives a stable opaque chat-history owner key", () => {
  const ownerKey = getChatOwnerKey("anonymous:private-client", "test-secret");

  assert.match(ownerKey, /^[a-f0-9]{64}$/);
  assert.equal(ownerKey.includes("private-client"), false);
  assert.equal(
    ownerKey,
    getChatOwnerKey("anonymous:private-client", "test-secret"),
  );
});
