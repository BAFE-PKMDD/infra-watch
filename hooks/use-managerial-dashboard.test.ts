import assert from "node:assert/strict";
import test from "node:test";

import { dashboardQueryKey } from "./use-managerial-dashboard";

test("uses normalized filters in a stable dashboard query key", () => {
  assert.deepEqual(
    dashboardQueryKey({ year: "2026", program: "AMEFIP" }, "user-1"),
    ["managerial-dashboard", "user-1", "program=AMEFIP&year=2026"],
  );
});

test("isolates dashboard caches between authenticated viewers", () => {
  assert.notDeepEqual(dashboardQueryKey({}, "admin-1"), dashboardQueryKey({}, "moderator-1"));
});
