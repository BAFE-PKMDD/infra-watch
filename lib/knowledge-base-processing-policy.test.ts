import assert from "node:assert/strict";
import test from "node:test";

import {
  assertKnowledgeBaseDocumentProcessable,
  assertKnowledgeBaseReplacementComplete,
  getKnowledgeBaseProcessingFailureMessage,
} from "./knowledge-base-processing-policy";

test("archived knowledge-base documents cannot be processed directly", () => {
  assert.throws(
    () => assertKnowledgeBaseDocumentProcessable({ archivedAt: new Date() }),
    (error: unknown) => {
      assert.equal((error as { status?: number }).status, 409);
      assert.match((error as Error).message, /restore/i);
      return true;
    },
  );

  assert.doesNotThrow(() => assertKnowledgeBaseDocumentProcessable({ archivedAt: null }));
});

test("partial replacement indexes are rejected", () => {
  assert.throws(
    () => assertKnowledgeBaseReplacementComplete(4, 3),
    /all document chunks/i,
  );
  assert.doesNotThrow(() => assertKnowledgeBaseReplacementComplete(4, 4));
});

test("persisted processing failures never expose provider or database details", () => {
  const message = getKnowledgeBaseProcessingFailureMessage(
    new Error("password=secret database provider timeout"),
  );

  assert.equal(message, "Document processing failed. Retry or contact an administrator.");
  assert.doesNotMatch(message, /password|secret|database|provider/i);
});
