import assert from "node:assert/strict";
import test from "node:test";

import {
  KNOWLEDGE_BASE_GROUNDING_INSTRUCTION,
  getChatActiveToolsForMessage,
} from "./chat-grounding";

test("knowledge-base grounding keeps synthetic test records separate from official projects", () => {
  assert.match(
    KNOWLEDGE_BASE_GROUNDING_INSTRUCTION,
    /synthetic or test record/i,
  );
  assert.match(
    KNOWLEDGE_BASE_GROUNDING_INSTRUCTION,
    /do not call project-database tools/i,
  );
  assert.match(
    KNOWLEDGE_BASE_GROUNDING_INSTRUCTION,
    /not an official infrastructure project/i,
  );
});

test("knowledge-base answers identify their reference source and preserve the user's language", () => {
  assert.match(KNOWLEDGE_BASE_GROUNDING_INSTRUCTION, /document title/i);
  assert.match(KNOWLEDGE_BASE_GROUNDING_INSTRUCTION, /same language/i);
  assert.match(KNOWLEDGE_BASE_GROUNDING_INSTRUCTION, /do not invent/i);
});

test("test-reference questions cannot invoke official project database tools", () => {
  assert.deepEqual(
    getChatActiveToolsForMessage("ano ang test project reference ?"),
    ["searchKnowledgeBase"],
  );
  assert.deepEqual(
    getChatActiveToolsForMessage("What is the synthetic QA document reference?"),
    ["searchKnowledgeBase"],
  );
});

test("ordinary official project questions keep all project tools available", () => {
  assert.equal(
    getChatActiveToolsForMessage("Show ongoing farm-to-market road projects"),
    undefined,
  );
});
