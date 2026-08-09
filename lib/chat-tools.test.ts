import assert from "node:assert/strict";
import test from "node:test";

import { chatTools } from "./chat-tools";

test("chat tools expose AI SDK input schemas", () => {
  for (const [name, chatTool] of Object.entries(chatTools)) {
    assert.ok(
      "inputSchema" in chatTool,
      `${name} must define inputSchema for AI SDK tool preparation`,
    );
    assert.ok(
      !("parameters" in chatTool),
      `${name} must not use the obsolete parameters property`,
    );
  }
});
