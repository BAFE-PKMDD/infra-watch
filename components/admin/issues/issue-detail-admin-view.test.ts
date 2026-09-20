import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./issue-detail-admin-view.tsx", import.meta.url), "utf8");
const actionSource = readFileSync(new URL("./issue-review-action.ts", import.meta.url), "utf8");

test("issue review leads with one clear next-action choice", () => {
  assert.match(source, /Choose the next step/);
  assert.match(actionSource, /Reply to the citizen/);
  assert.match(actionSource, /Add a staff note/);
  assert.match(actionSource, /Change case status/);
  assert.match(actionSource, /Publish a public summary/);
  assert.doesNotMatch(source, />Submit Response</);
});

test("supporting case information uses progressive disclosure", () => {
  assert.match(source, /Report and evidence/);
  assert.match(source, /Reporter and case details/);
  assert.match(source, /Evidence map and location trail/);
  assert.match(source, /Previous updates/);
  assert.ok((source.match(/<details/g) ?? []).length >= 2);
  assert.equal((source.match(/<Disclosure/g) ?? []).length, 2);
});

test("previous updates retain the actual status transition", () => {
  assert.match(source, /formatStatusChange\(response\.statusChange\)/);
});

test("ambiguous publication and internal-only checkboxes are removed", () => {
  assert.doesNotMatch(source, /Approve for public view/);
  assert.doesNotMatch(source, />\s*Internal only\s*</);
  assert.match(source, /Only the reviewed summary will be public/);
});
