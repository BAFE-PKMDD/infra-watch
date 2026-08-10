import assert from "node:assert/strict";
import test from "node:test";

import {
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
