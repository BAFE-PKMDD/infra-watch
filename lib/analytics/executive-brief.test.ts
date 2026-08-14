import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutiveBriefMarkdown,
  executiveBriefFilename,
  executiveBriefPersistenceKey,
  executiveBriefStaleNudge,
  shouldRetryExecutiveBrief,
  EXECUTIVE_BRIEF_PROMPT,
} from "./executive-brief";

test("builds a downloadable brief with scope, data date, generation date, and disclaimer", () => {
  const markdown = buildExecutiveBriefMarkdown({
    content: "## Portfolio position\n\nDelivery remains stable.",
    filters: { program: "AMEFIP", health: "atRisk" },
    asOf: "2026-08-10",
    generatedAt: new Date("2026-08-10T01:30:00.000Z"),
  });
  assert.match(markdown, /^# Infrastructure Analytics Executive Brief/m);
  assert.match(markdown, /\*\*Data as of:\*\* 2026-08-10/);
  assert.match(markdown, /Program: AMEFIP · Schedule health: At risk/);
  assert.match(markdown, /\*\*Generated:\*\* 2026-08-10T01:30:00.000Z/);
  assert.match(markdown, /Delivery remains stable/);
  assert.match(markdown, /AI-generated analysis/);
});

test("uses a stable filesystem-safe brief filename", () => {
  assert.equal(executiveBriefFilename("2026-08-10"), "infrastructure-analytics-executive-brief-2026-08-10.md");
  assert.equal(executiveBriefFilename("invalid/date"), "infrastructure-analytics-executive-brief.md");
});

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

test("download removes a model-repeated disclaimer and uses an accurate handling label", () => {
  const markdown = buildExecutiveBriefMarkdown({
    content: "## Executive Summary\nFine.\n\nAI-generated analysis—verify against the Infrastructure Analytics Dashboard before making official decisions.",
    filters: {}, asOf: "2026-08-10", generatedAt: new Date("2026-08-10T00:00:00Z"),
  });
  assert.equal(markdown.match(/AI-generated analysis/g)?.length, 1);
  assert.match(markdown, /Management working draft — authorized dashboard scope/);
  assert.doesNotMatch(markdown, /secret|confidential/i);
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
