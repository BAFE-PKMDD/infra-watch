import assert from "node:assert/strict";
import { test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  ABEMIS_SYNC_YEARS,
  getAbemisSyncExclusionReason,
  isYearFundedInSyncScope,
  projectYearScopeCondition,
} from "./year-scope";

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

test("excludes proposal and pre-implementation stages funded through 2024", () => {
  for (const stage of ["Proposal", "Pre-implementation"]) {
    for (const yearFunded of ["2021", "2022", "2023", "2024"]) {
      assert.equal(
        getAbemisSyncExclusionReason({ year_funded: yearFunded, stage, status: "For Review" }),
        "proposal-or-pre-implementation-through-2024",
      );
    }
  }
});

test("includes proposal and pre-implementation stages funded from 2025 onward", () => {
  for (const stage of ["Proposal", "Pre-implementation"]) {
    for (const yearFunded of ["2025", "2026"]) {
      assert.equal(
        getAbemisSyncExclusionReason({ year_funded: yearFunded, stage, status: "For Validation" }),
        null,
      );
    }
  }
});

test("excludes cancelled or archived projects regardless of stage", () => {
  for (const status of ["Cancelled", "Canceled", "Archived", "Archive"]) {
    assert.equal(
      getAbemisSyncExclusionReason({ year_funded: "2026", stage: "Implementation", status }),
      "cancelled-or-archived",
    );
  }
});

test("excludes invalid or unclassified project stages", () => {
  for (const stage of [null, undefined, "", "0", "invalid", "unclassified"]) {
    assert.equal(
      getAbemisSyncExclusionReason({ year_funded: "2026", stage, status: "For Validation" }),
      "invalid-or-unclassified-stage",
    );
  }
});

test("keeps recognized non-proposal stages in the documented year scope", () => {
  for (const stage of ["Inventory", "Procurement", "Implementation", "Completed"]) {
    assert.equal(
      getAbemisSyncExclusionReason({ year_funded: "2024", stage, status: "For Review" }),
      null,
    );
  }
});

test("database project scope applies the same lifecycle exclusions as synchronization", () => {
  const query = new PgDialect().sqlToQuery(projectYearScopeCondition());

  assert.match(query.sql, /year_funded/);
  assert.match(query.sql, /stage/);
  assert.match(query.sql, /status/);
  assert.deepEqual(query.params, [
    "2021", "2022", "2023", "2024", "2025", "2026",
    "", "0", "invalid", "unclassified",
    "proposal", "pre-implementation", "2021", "2022", "2023", "2024",
    "%cancel%", "%archiv%",
  ]);
});
