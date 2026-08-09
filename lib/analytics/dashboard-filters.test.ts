import assert from "node:assert/strict";
import test from "node:test";

import { parseManagerialDashboardFilters } from "./dashboard-filters";

test("normalizes all and blank filter values to undefined", () => {
  assert.deepEqual(
    parseManagerialDashboardFilters(
      new URLSearchParams({ program: "all", region: "  ", year: "ALL" }),
    ),
    {},
  );
});

test("trims supported filters and accepts a province only as a narrowing filter", () => {
  assert.deepEqual(
    parseManagerialDashboardFilters(
      new URLSearchParams({
        program: " AMEFIP ",
        year: "2026",
        region: " Region VIII ",
        province: " Leyte ",
        projectType: " Farm-to-market road ",
        status: "ongoing",
        health: "atRisk",
      }),
    ),
    {
      program: "AMEFIP",
      year: "2026",
      region: "Region VIII",
      province: "Leyte",
      projectType: "Farm-to-market road",
      status: "ongoing",
      health: "atRisk",
    },
  );
});

test("rejects unsupported status and schedule-health values", () => {
  assert.throws(
    () => parseManagerialDashboardFilters(new URLSearchParams({ status: "deleted" })),
    /status/i,
  );
  assert.throws(
    () => parseManagerialDashboardFilters(new URLSearchParams({ health: "critical" })),
    /health/i,
  );
});

test("accepts only bounded four-digit funding years", () => {
  for (const year of ["26", "2201", "abcd", "20260"]) {
    assert.throws(
      () => parseManagerialDashboardFilters(new URLSearchParams({ year })),
      /year/i,
    );
  }
  assert.equal(
    parseManagerialDashboardFilters(new URLSearchParams({ year: "2026" })).year,
    "2026",
  );
});

test("length-limits free-text filter values", () => {
  assert.throws(
    () =>
      parseManagerialDashboardFilters(
        new URLSearchParams({ projectType: "x".repeat(101) }),
      ),
    /projectType/i,
  );
});
