import assert from "node:assert/strict";
import test from "node:test";
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
