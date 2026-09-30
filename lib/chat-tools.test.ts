import assert from "node:assert/strict";
import { test } from "bun:test";

import { ADMIN_ONLY_TOOL_NAMES, createChatTools } from "./chat-tools";

test("chat tools expose AI SDK input schemas", () => {
  for (const surfaceContext of [{ isAdminSurface: true }, { isAdminSurface: false }]) {
    for (const [name, chatTool] of Object.entries(createChatTools(surfaceContext))) {
      assert.ok(
        "inputSchema" in chatTool,
        `${name} must define inputSchema for AI SDK tool preparation`,
      );
      assert.ok(
        !("parameters" in chatTool),
        `${name} must not use the obsolete parameters property`,
      );
    }
  }
});

test("the tool set has the same keys regardless of surface", () => {
  assert.deepEqual(
    Object.keys(createChatTools({ isAdminSurface: true })).sort(),
    Object.keys(createChatTools({ isAdminSurface: false })).sort(),
  );
});

test("getUserStats refuses to run outside the admin surface even if somehow invoked", async () => {
  const tools = createChatTools({ isAdminSurface: false });
  // Cast the execute context: only the tool's own admin check is under test here,
  // and it never touches the AI SDK's execution-context fields.
  const execute = tools.getUserStats.execute as (input: object, options: unknown) => Promise<unknown>;
  const result = await execute({}, {});
  assert.deepEqual(result, {
    allowed: false,
    message: "Account statistics are only available on the admin interface.",
  });
});

test("getUserStats is declared admin-only for active-tools gating", () => {
  assert.deepEqual(ADMIN_ONLY_TOOL_NAMES, ["getUserStats"]);
});
