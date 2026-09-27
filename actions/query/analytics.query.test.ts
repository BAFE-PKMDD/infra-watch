import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateInfraAnalyticsRows,
  getInfraAnalyticsData,
  MAX_PUBLIC_ANALYTICS_ROWS,
  type InfraAnalyticsRow,
} from "./analytics.query";

const row: InfraAnalyticsRow = {
  status: "ongoing",
  stage: "Implementation",
  region: "Region VIII",
  bannerProgram: "Rice Program",
  program: "AMEFIP",
  yearFunded: "2025",
  lastSyncedAt: new Date("2026-08-09T18:00:00.000Z"),
  budget: null,
  latitude: null,
  longitude: null,
  startDate: null,
  targetCompletionDate: null,
  actualCompletionDate: null,
};

const DAY_MS = 24 * 60 * 60 * 1000;
function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}
function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS);
}

test("returns a typed empty state instead of reference figures", () => {
  const result = aggregateInfraAnalyticsRows([]);
  assert.deepEqual(result, { status: "empty", data: null });
});

test("sums approved budget per region, not just national totals", () => {
  const rows: InfraAnalyticsRow[] = [
    { ...row, region: "Region VIII", budget: "1000000" },
    { ...row, region: "Region VIII", budget: "500000" },
    { ...row, region: "National Capital Region (NCR)", budget: "2000000" },
    { ...row, region: "Region VIII", budget: null },
  ];
  const result = aggregateInfraAnalyticsRows(rows, null);
  const r8 = result.data?.regionalStats.find((r) => r.region === "R8");
  const ncr = result.data?.regionalStats.find((r) => r.region === "NCR");
  assert.equal(r8?.approvedBudget, 1_500_000);
  assert.equal(r8?.target, 3);
  assert.equal(ncr?.approvedBudget, 2_000_000);
});

test("tracks completed-or-turned-over counts per region, matching the national definition", () => {
  const rows: InfraAnalyticsRow[] = [
    { ...row, region: "Region VIII", status: "Inventory", stage: null },
    { ...row, region: "Region VIII", status: "ongoing", stage: "Turned Over" },
    { ...row, region: "Region VIII", status: "ongoing", stage: "Implementation" },
    { ...row, region: "National Capital Region (NCR)", status: "ongoing", stage: "Implementation" },
  ];
  const result = aggregateInfraAnalyticsRows(rows, null);
  const r8 = result.data?.regionalStats.find((r) => r.region === "R8");
  const ncr = result.data?.regionalStats.find((r) => r.region === "NCR");
  assert.equal(r8?.target, 3);
  assert.equal(r8?.completedOrTurnedOver, 2);
  assert.equal(ncr?.completedOrTurnedOver, 0);
});

test("does not label project-row ingestion time as a successful synchronization", () => {
  const result = aggregateInfraAnalyticsRows([row], null);
  assert.equal(result.data?.source.lastSuccessfulSync, "Unknown");
});

test("returns unavailable when the live query fails", async () => {
  const result = await getInfraAnalyticsData(
    async () => {
      throw new Error("database unavailable");
    },
    () => undefined,
    async () => null,
  );
  assert.deepEqual(result, { status: "unavailable", data: null });
});

test("does not silently aggregate an oversized public portfolio", async () => {
  const oversized = Array.from({ length: MAX_PUBLIC_ANALYTICS_ROWS + 1 }, () => row);
  const result = await getInfraAnalyticsData(
    async () => oversized,
    () => undefined,
    async () => null,
  );
  assert.deepEqual(result, { status: "unavailable", data: null });
});

test("uses the latest completed project sync supplied by the sync-log query", async () => {
  const completedAt = new Date("2026-08-10T01:00:00.000Z");
  const result = await getInfraAnalyticsData(
    async () => [row],
    () => undefined,
    async () => completedAt,
  );

  assert.equal(result.data?.source.lastSuccessfulSync, "Aug 10, 2026, 9:00 AM");
});

test("uses the normalized banner-program value and explicit Unknown buckets", () => {
  const result = aggregateInfraAnalyticsRows([
    row,
    { ...row, region: null, bannerProgram: null, program: null, yearFunded: null },
  ]);
  assert.equal(result.status, "ready");
  assert.ok(result.data?.regionalStats.some((item) => item.region === "Unknown"));
  assert.ok(result.data?.bannerStats.some((item) => item.program === "Unknown"));
  assert.ok(result.data?.bannerStats.some((item) => item.program === "Rice Program"));
});

test("derives public scope copy from data instead of hardcoding AMEFIP FY 2026", () => {
  const result = aggregateInfraAnalyticsRows([row]);
  assert.equal(result.data?.scopeLabel, "AMEFIP · FY 2025");
  assert.notEqual(result.data?.scopeLabel, "AMEFIP FY 2026");
});

test("caps long banner-program charts while preserving Unknown and all totals", () => {
  const rows = Array.from({ length: 14 }, (_, index) => ({
    ...row,
    bannerProgram: index === 13 ? null : `Program ${index + 1}`,
  }));
  const result = aggregateInfraAnalyticsRows(rows);
  const banners = result.data?.bannerStats ?? [];

  assert.ok(banners.length <= 8);
  assert.ok(banners.some((item) => item.program === "Unknown"));
  assert.ok(banners.some((item) => item.program === "Other"));
  assert.equal(banners.reduce((sum, item) => sum + item.target, 0), rows.length);
});

test("uses the shared canonical status mapping for Inventory", () => {
  const result = aggregateInfraAnalyticsRows([{ ...row, status: "Inventory", stage: null }]);
  assert.equal(result.data?.stages.completed.count, 1);
  assert.equal(result.data?.stages.preImplementation.count, 0);
});

test("publishes one traceable summary contract for homepage and public analytics", () => {
  const result = aggregateInfraAnalyticsRows([
    {
      ...row,
      status: "Inventory",
      stage: null,
      budget: "4000000.00",
      latitude: 14.5995,
      longitude: 120.9842,
    },
    {
      ...row,
      status: "ongoing",
      stage: "Implementation",
      budget: null,
      latitude: null,
      longitude: null,
    },
  ], new Date("2026-08-10T01:00:00.000Z"));

  assert.equal(result.status, "ready");
  assert.deepEqual(result.data?.summary, {
    approvedBudget: 4_000_000,
    budgetCoverage: { available: 1, total: 2 },
    completedOrTurnedOver: { count: 1, percentage: 50, total: 2 },
    mappedProjects: { count: 1, total: 2 },
  });
  assert.equal(result.data?.source.name, "ABEMIS infrastructure project feed");
  assert.equal(result.data?.source.projectCount, result.data?.totalTarget);
  assert.match(result.data?.source.lastSuccessfulSync ?? "", /2026/);
});

test("counts overdue schedule rows, keeps unknown target dates separate, and excludes completed or actually-finished rows", () => {
  const rows: InfraAnalyticsRow[] = [
    { ...row, stage: "Implementation", targetCompletionDate: daysAgo(10) }, // construction, overdue
    { ...row, stage: "Implementation", targetCompletionDate: daysAgo(30) }, // construction, overdue
    { ...row, stage: "Procurement", targetCompletionDate: daysFromNow(5) }, // procurement, not yet due
    { ...row, stage: "Implementation", targetCompletionDate: null }, // unknown target date
    { ...row, status: "Inventory", stage: null, targetCompletionDate: daysAgo(100) }, // completed stage, out of scope
    { ...row, stage: "Implementation", targetCompletionDate: daysAgo(15), actualCompletionDate: new Date() }, // already actually completed
  ];
  const result = aggregateInfraAnalyticsRows(rows);
  assert.deepEqual(result.data?.schedulePerformance, {
    overdueCount: 2,
    medianDaysOverdue: 20,
    total: 3,
    unknownScheduleCount: 1,
  });
});

test("returns explicit zero and unknown schedule figures instead of throwing when no target dates are recorded", () => {
  const result = aggregateInfraAnalyticsRows([row, { ...row, stage: "Procurement" }]);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.data?.schedulePerformance, {
    overdueCount: 0,
    medianDaysOverdue: null,
    total: 0,
    unknownScheduleCount: 2,
  });
});
