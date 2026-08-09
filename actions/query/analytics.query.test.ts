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
};

test("returns a typed empty state instead of reference figures", () => {
  const result = aggregateInfraAnalyticsRows([]);
  assert.deepEqual(result, { status: "empty", data: null });
});

test("returns unavailable when the live query fails", async () => {
  const result = await getInfraAnalyticsData(
    async () => {
      throw new Error("database unavailable");
    },
    () => undefined,
  );
  assert.deepEqual(result, { status: "unavailable", data: null });
});

test("does not silently aggregate an oversized public portfolio", async () => {
  const oversized = Array.from({ length: MAX_PUBLIC_ANALYTICS_ROWS + 1 }, () => row);
  const result = await getInfraAnalyticsData(async () => oversized, () => undefined);
  assert.deepEqual(result, { status: "unavailable", data: null });
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
