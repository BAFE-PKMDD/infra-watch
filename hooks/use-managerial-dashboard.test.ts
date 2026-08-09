import assert from "node:assert/strict";
import test from "node:test";

import { dashboardQueryKey } from "./use-managerial-dashboard";

test("uses normalized filters in a stable dashboard query key", () => {
  assert.deepEqual(
    dashboardQueryKey({ year: "2026", program: "AMEFIP" }),
    ["managerial-dashboard", "program=AMEFIP&year=2026"],
  );
});
