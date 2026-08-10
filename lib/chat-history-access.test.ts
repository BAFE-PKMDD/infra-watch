import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";

import { chatHistory } from "@/lib/db/schema";
import { getChatHistoryVisibilityCondition } from "./chat-history-access";

function compile(role: "admin" | "moderator", userId: string) {
  const condition = getChatHistoryVisibilityCondition({ role, userId });
  return condition ? new PgDialect().sqlToQuery(condition) : null;
}

test("administrators can inspect every retained chat surface", () => {
  assert.equal(compile("admin", "admin-1"), null);
});

test("moderators can inspect public history and only their own managerial history", () => {
  const query = compile("moderator", "moderator-1");
  assert.ok(query);
  assert.match(query.sql, /surface/);
  assert.match(query.sql, /user_id/);
  assert.deepEqual(query.params, ["public_chat", "moderator-1"]);
  assert.equal(chatHistory.surface.notNull, true);
  assert.equal(chatHistory.surface.default, "public_chat");
});
