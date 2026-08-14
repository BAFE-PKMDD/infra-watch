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
};

test("returns a typed empty state instead of reference figures", () => {
  const result = aggregateInfraAnalyticsRows([]);
  assert.deepEqual(result, { status: "empty", data: null });
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
