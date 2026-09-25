import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const feedbackQuerySource = readFileSync(new URL("./feedback.query.ts", import.meta.url), "utf8");

test("feedback administration fails closed for an unassigned moderator", () => {
  assert.match(feedbackQuerySource, /if \(!hasAssignedModeratorScope\(user\)\)/);
  assert.match(feedbackQuerySource, /status\?: number \}\)\.status = 403/);
});

test("sentiment filter only ever admits the two known values", () => {
  assert.match(
    feedbackQuerySource,
    /value === "positive" \|\| value === "negative" \? value : null/,
  );
});
