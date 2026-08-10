import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutiveBriefMarkdown,
  executiveBriefFilename,
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
  assert.equal(
    executiveBriefFilename("2026-08-10"),
    "infrastructure-analytics-executive-brief-2026-08-10.md",
  );
  assert.equal(
    executiveBriefFilename("invalid/date"),
    "infrastructure-analytics-executive-brief.md",
  );
});