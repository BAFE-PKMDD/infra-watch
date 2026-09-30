import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  KNOWLEDGE_BASE_GROUNDING_INSTRUCTION,
  getChatActiveToolsForMessage,
  resolveActiveChatTools,
} from "./chat-grounding";

const ALL_TOOL_NAMES = [
  "searchProjects",
  "getProjectStats",
  "getDelayedProjectsSummary",
  "getProjectById",
  "searchKnowledgeBase",
  "getUserStats",
] as const;

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

test("the public surface never gets getUserStats, no matter how the question is phrased", () => {
  const active = resolveActiveChatTools(
    [...ALL_TOOL_NAMES],
    "Show ongoing farm-to-market road projects",
    false,
  );
  assert.ok(!active.includes("getUserStats"));
  assert.deepEqual(active.sort(), ALL_TOOL_NAMES.filter((n) => n !== "getUserStats").sort());
});

test("the admin surface keeps getUserStats available for an ordinary question", () => {
  const active = resolveActiveChatTools([...ALL_TOOL_NAMES], "how many users do we have", true);
  assert.ok(active.includes("getUserStats"));
});

test("a test-reference question narrows to searchKnowledgeBase on both surfaces, and getUserStats is still excluded for public", () => {
  const publicActive = resolveActiveChatTools(
    [...ALL_TOOL_NAMES],
    "what is the test QA reference document?",
    false,
  );
  assert.deepEqual(publicActive, ["searchKnowledgeBase"]);

  const adminActive = resolveActiveChatTools(
    [...ALL_TOOL_NAMES],
    "what is the test QA reference document?",
    true,
  );
  assert.deepEqual(adminActive, ["searchKnowledgeBase"]);
});
