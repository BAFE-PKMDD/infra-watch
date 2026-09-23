import assert from "node:assert/strict";
import test from "node:test";

import { ABEMIS_SYNC_YEARS, isYearFundedInSyncScope } from "./year-scope";

test("accepts every year in the documented 2021-2026 ABEMIS scope", () => {
  for (const year of ["2021", "2022", "2023", "2024", "2025", "2026"]) {
    assert.equal(isYearFundedInSyncScope(year), true);
  }
  assert.deepEqual(ABEMIS_SYNC_YEARS, ["2021", "2022", "2023", "2024", "2025", "2026"]);
});

test("rejects funding years outside the 2021-2026 scope", () => {
  for (const year of ["1990", "2020", "2027", "2030"]) {
    assert.equal(isYearFundedInSyncScope(year), false);
  }
});

test("rejects missing or non-numeric funding years", () => {
  for (const value of [null, undefined, "", "OVERALL", "not-a-year"]) {
    assert.equal(isYearFundedInSyncScope(value), false);
  }
});
