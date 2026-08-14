import assert from "node:assert/strict";
import test from "node:test";

import { calculateProjectPassportCoverage, formatPublicSyncDate } from "./project-passport";

test("counts only observed core passport values and treats zero as observed", () => {
  assert.deepEqual(calculateProjectPassportCoverage([
    "AMEFIP-1",
    "Project name",
    null,
    undefined,
    "",
    0,
    false,
    4_000_000,
  ]), { available: 5, total: 8 });
});

test("formats source synchronization time in Philippine time", () => {
  assert.match(formatPublicSyncDate(new Date("2026-08-10T14:15:00.000Z")), /Aug 10, 2026/);
  assert.match(formatPublicSyncDate(new Date("2026-08-10T14:15:00.000Z")), /10:15 PM/);
});
