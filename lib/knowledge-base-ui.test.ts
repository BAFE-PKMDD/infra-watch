import assert from "node:assert/strict";
import { test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const pageSource = readFileSync(
  path.join(process.cwd(), "app", "(admin)", "knowledge-base", "page.tsx"),
  "utf8",
);
const mutationSource = readFileSync(
  path.join(process.cwd(), "actions", "mutation", "knowledge-base.mutation.ts"),
  "utf8",
);
const processRouteSource = readFileSync(
  path.join(process.cwd(), "app", "api", "knowledge-base", "process", "route.ts"),
  "utf8",
);

test("knowledge base keeps the archive visible in the primary controls", () => {
  assert.match(pageSource, /Open Archive/);
  assert.match(pageSource, /archivedDocuments/);
});

test("knowledge base asks before archiving an active document", () => {
  assert.match(pageSource, /pendingArchive/);
  assert.match(pageSource, /Archive this document\?/);
  assert.match(pageSource, /Confirm Archive/);
});

test("permanent deletion is available only from the archive and requires a modal", () => {
  assert.match(pageSource, /pendingDeletion/);
  assert.match(pageSource, /Delete permanently\?/);
  assert.match(pageSource, /Delete Permanently/);
  assert.match(pageSource, /repositoryView === "archived"/);
  assert.match(mutationSource, /Archive the document before deleting it permanently/);
});

test("FAQ embedding failures use the shared sanitized message", () => {
  const createFaqSource = mutationSource.slice(
    mutationSource.indexOf("export async function addFaqEntry"),
    mutationSource.indexOf("export async function deleteKbDocument"),
  );
  assert.match(createFaqSource, /getKnowledgeBaseProcessingFailureMessage/);
  assert.doesNotMatch(createFaqSource, /embedError instanceof Error/);
  assert.doesNotMatch(createFaqSource, /embedding failed:.*errorMsg/i);
  assert.doesNotMatch(mutationSource, /error instanceof Error\s*\?\s*error\.message/);
});

test("reindex keeps the current chunks until replacements are ready for an atomic swap", () => {
  const reindexAction = mutationSource.slice(mutationSource.indexOf("export async function reindexDocument"));
  assert.doesNotMatch(reindexAction, /db\.delete\(kbChunks\)/);

  const generateIndex = processRouteSource.indexOf("await generateEmbedding(chunk.content)");
  const completenessCheckIndex = processRouteSource.indexOf(
    "assertKnowledgeBaseReplacementComplete(textChunks.length, embeddedCount)",
  );
  const transactionIndex = processRouteSource.indexOf("await db.transaction");
  const deleteIndex = processRouteSource.indexOf("transaction.delete(kbChunks)");
  const insertIndex = processRouteSource.indexOf("transaction.insert(kbChunks)");

  assert.ok(generateIndex >= 0);
  assert.ok(completenessCheckIndex > generateIndex);
  assert.ok(transactionIndex > completenessCheckIndex);
  assert.ok(deleteIndex > transactionIndex);
  assert.ok(insertIndex > deleteIndex);
});
