import assert from "node:assert/strict";
import test from "node:test";

import { MANAGERIAL_AI_SYSTEM_INSTRUCTION } from "./managerial-ai-prompt";

test("ANIA answers lead with the requested analysis instead of repeated UI context", () => {
  assert.match(MANAGERIAL_AI_SYSTEM_INSTRUCTION, /do not introduce yourself/i);
  assert.match(MANAGERIAL_AI_SYSTEM_INSTRUCTION, /interface already displays.*data date.*authorized scope/i);
  assert.match(MANAGERIAL_AI_SYSTEM_INSTRUCTION, /omit.*below is/i);
  assert.doesNotMatch(MANAGERIAL_AI_SYSTEM_INSTRUCTION, /Include a visible "Data as of <timestamp>" line in every answer/i);
});
