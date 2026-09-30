import assert from "node:assert/strict";
import { test } from "bun:test";

import { getAnalyticsRetentionCutoffs } from "./citizen-analytics-maintenance";

test("computes stable UTC cutoffs for 90-day raw and two-year aggregate retention", () => {
  const cutoffs = getAnalyticsRetentionCutoffs(new Date("2026-09-22T03:30:00.000Z"));
  assert.equal(cutoffs.rawEventsBefore.toISOString(), "2026-06-23T16:00:00.000Z");
  assert.equal(cutoffs.dailyAggregatesBefore, "2024-09-22");
});
