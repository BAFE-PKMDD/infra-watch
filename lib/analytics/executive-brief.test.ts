import assert from "node:assert/strict";
import test from "node:test";

import {
  executiveBriefPersistenceKey,
  executiveBriefStaleNudge,
  shouldRetryExecutiveBrief,
  stripExecutiveBriefDisclaimer,
  EXECUTIVE_BRIEF_PROMPT,
} from "./executive-brief";

test("prompt requires four analytical lenses and forbids invented predictive claims", () => {
  for (const heading of ["Executive Summary", "Descriptive Analytics", "Diagnostic Analytics", "Predictive Analytics", "Prescriptive Analytics", "Data Limitations"]) {
    assert.match(EXECUTIVE_BRIEF_PROMPT, new RegExp(heading));
  }
  assert.match(EXECUTIVE_BRIEF_PROMPT, /only when.*tool.*official data/i);
  assert.match(EXECUTIVE_BRIEF_PROMPT, /never (?:invent|recalculate)/i);
  assert.match(EXECUTIVE_BRIEF_PROMPT, /insufficient history/i);
  assert.match(EXECUTIVE_BRIEF_PROMPT, /rules-based.*not.*predictive/i);
  assert.match(EXECUTIVE_BRIEF_PROMPT, /do not include.*disclaimer/i);
});

test("removes a model-repeated disclaimer from generated content", () => {
  const content = stripExecutiveBriefDisclaimer(
    "## Executive Summary\nFine.\n\nAI-generated analysis—verify against the Infrastructure Analytics Dashboard before making official decisions.",
  );
  assert.doesNotMatch(content, /AI-generated analysis/);
  assert.match(content, /Fine/);
});

test("persistence keys are isolated by user, filters, data date, and successful sync", () => {
  const sync = "2026-08-10T01:00:00.000Z";
  const key = executiveBriefPersistenceKey("user-1", { region: "08", program: "AMEFIP" }, "2026-08-10", sync);
  assert.equal(key, executiveBriefPersistenceKey("user-1", { program: "AMEFIP", region: "08" }, "2026-08-10", sync));
  assert.notEqual(key, executiveBriefPersistenceKey("user-2", { region: "08", program: "AMEFIP" }, "2026-08-10", sync));
  assert.notEqual(key, executiveBriefPersistenceKey("user-1", { region: "09", program: "AMEFIP" }, "2026-08-10", sync));
  assert.notEqual(key, executiveBriefPersistenceKey("user-1", { region: "08", program: "AMEFIP" }, "2026-08-11", sync));
  assert.notEqual(key, executiveBriefPersistenceKey("user-1", { region: "08", program: "AMEFIP" }, "2026-08-10", "2026-08-10T02:00:00.000Z"));
});

test("stale nudge is derived from the supplied as-of date", () => {
  assert.equal(executiveBriefStaleNudge("2026-08-10", new Date("2026-08-10T12:00:00Z")), null);
  assert.match(executiveBriefStaleNudge("2026-08-08", new Date("2026-08-10T12:00:00Z")) ?? "", /2026-08-08/);
  assert.equal(executiveBriefStaleNudge("not-a-date", new Date("2026-08-10T12:00:00Z")), null);
});

test("automatic retry is bounded to transient failures before streaming starts", () => {
  assert.equal(shouldRetryExecutiveBrief(0, 503, false), true);
  assert.equal(shouldRetryExecutiveBrief(1, 503, false), false);
  assert.equal(shouldRetryExecutiveBrief(0, 400, false), false);
  assert.equal(shouldRetryExecutiveBrief(0, 503, true), false);
});
