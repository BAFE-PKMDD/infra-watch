import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateInfraAnalyticsRows,
  getInfraAnalyticsData,
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
