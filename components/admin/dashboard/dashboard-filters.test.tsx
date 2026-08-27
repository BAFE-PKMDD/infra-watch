import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DashboardFilters,
  dashboardFiltersToSearchParams,
  mergeDashboardFilter,
  resetDashboardFilters,
} from "./dashboard-filters";

test("serializes filters to readable URL parameters", () => {
  assert.equal(
    dashboardFiltersToSearchParams(
      mergeDashboardFilter(
        { program: "AMEFIP", province: "Leyte" },
        "year",
        "2026",
      ),
    ).toString(),
    "program=AMEFIP&year=2026&province=Leyte",
  );
});

test("changing region clears an incompatible province", () => {
  assert.deepEqual(
    mergeDashboardFilter(
      { region: "Region VIII", province: "Leyte" },
      "region",
      "Region VI",
    ),
    { region: "Region VI" },
  );
});

test("reset clears all dashboard filters", () => {
  assert.deepEqual(resetDashboardFilters(), {});
});

test("summarizes active filters with removable keyboard controls", () => {
  const html = renderToStaticMarkup(createElement(DashboardFilters, {
    filters: { region: "Region VIII", health: "atRisk" },
    options: {
      programs: [],
      years: [],
      regions: ["Region VIII"],
      provinces: [],
      projectTypes: [],
      statuses: [],
    },
    onChange: () => undefined,
  }));

  assert.match(html, /Filters/);
  assert.match(html, /2 active filters/);
  assert.match(html, /Region: Region VIII/);
  assert.match(html, /Timeline status: At risk/);
  assert.match(html, /Remove Region filter/);
  assert.match(html, /Reset filters/);
  assert.doesNotMatch(html, /All indicators and drill-downs/);
  assert.doesNotMatch(html, /<details[^>]* open=/);
});

test("keeps filters expanded and hides reset when no filter is active", () => {
  const html = renderToStaticMarkup(createElement(DashboardFilters, {
    filters: {},
    options: {
      programs: [], years: [], regions: [], provinces: [], projectTypes: [], statuses: [],
    },
    onChange: () => undefined,
  }));

  assert.match(html, /<details[^>]* open=/);
  assert.doesNotMatch(html, /Reset filters/);
});
