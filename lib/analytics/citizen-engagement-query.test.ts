import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManilaEventDayExpression,
  buildManilaFeedbackDayExpression,
  buildVisibleNetworkRegionQuery,
  summarizeApproximateNetworkRegions,
  parseCitizenAnalyticsRange,
  toIssueCategoryLabel,
} from "./citizen-engagement-query";
import { db } from "@/lib/db";
import { analyticsEvents, feedback } from "@/lib/db/schema";

test("uses a 30-day Asia/Manila range by default", () => {
  const range = parseCitizenAnalyticsRange({}, new Date("2026-09-22T02:00:00.000Z"));

  assert.equal(range.from, "2026-08-24");
  assert.equal(range.to, "2026-09-22");
  assert.equal(range.earliestAvailable, "2026-06-25");
  assert.equal(range.start.toISOString(), "2026-08-23T16:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-09-22T16:00:00.000Z");
  assert.equal(range.timeZone, "Asia/Manila");
});

test("accepts an inclusive custom range up to 90 days", () => {
  const range = parseCitizenAnalyticsRange(
    { from: "2026-07-01", to: "2026-09-28" },
    new Date("2026-09-28T04:00:00.000Z"),
  );
  assert.equal(range.from, "2026-07-01");
  assert.equal(range.to, "2026-09-28");
});

test("rejects invalid, reversed, overlong, future, and expired ranges", () => {
  assert.throws(() => parseCitizenAnalyticsRange({ from: "bad", to: "2026-09-22" }), /date/i);
  assert.throws(() => parseCitizenAnalyticsRange({ from: "2026-09-23", to: "2026-09-22" }), /before/i);
  assert.throws(() => parseCitizenAnalyticsRange({ from: "2026-01-01", to: "2026-09-22" }), /90 days/i);
  assert.throws(() => parseCitizenAnalyticsRange({ from: "2026-09-23", to: "2026-09-24" }, new Date("2026-09-22T04:00:00Z")), /future/i);
  assert.throws(() => parseCitizenAnalyticsRange({ from: "2026-06-20", to: "2026-06-22" }, new Date("2026-09-22T04:00:00Z")), /retained/i);
});

test("formats controlled and legacy issue category codes without merging taxonomies", () => {
  assert.equal(toIssueCategoryLabel("construction_delay"), "Construction delay");
  assert.equal(toIssueCategoryLabel("quality"), "Quality");
  assert.equal(toIssueCategoryLabel("other"), "Other");
  assert.equal(toIssueCategoryLabel(""), "Not classified");
});

test("uses a literal Manila timezone consistently in selected and grouped event days", () => {
  const query = db
    .select({ day: buildManilaEventDayExpression() })
    .from(analyticsEvents)
    .groupBy(buildManilaEventDayExpression())
    .toSQL();

  assert.match(query.sql, /timezone\('Asia\/Manila'/);
  assert.equal(query.params.includes("Asia/Manila"), false);

  const feedbackQuery = db
    .select({ day: buildManilaFeedbackDayExpression() })
    .from(feedback)
    .groupBy(buildManilaFeedbackDayExpression())
    .toSQL();
  assert.match(feedbackQuery.sql, /timezone\('Asia\/Manila'/);
  assert.equal(feedbackQuery.params.includes("Asia/Manila"), false);
});

test("suppresses approximate network regions below five events", () => {
  assert.deepEqual(summarizeApproximateNetworkRegions([
    { code: "PH130000000", count: 8 },
    { code: "PH070000000", count: 5 },
    { code: "PH030000000", count: 4 },
    { code: null, count: 12 },
  ]), {
    minimumEventCount: 5,
    regions: [
      { code: "PH130000000", count: 8 },
      { code: "PH070000000", count: 5 },
    ],
  });
});

test("suppresses network-region rows in SQL before serialization", () => {
  const range = parseCitizenAnalyticsRange({}, new Date("2026-09-22T04:00:00.000Z"));
  const query = buildVisibleNetworkRegionQuery(range).toSQL();
  assert.match(query.sql, /having count\(\*\) >= 5/i);
});
