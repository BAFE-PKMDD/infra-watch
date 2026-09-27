import assert from "node:assert/strict";
import test from "node:test";
import { canSelectVideoRegion, resolveVideoRegion } from "./live-video-region";

test("NCR admins must select a valid video region", () => {
  for (const region of ["NCR", "National Capital Region (NCR)", "National Capital Region", "PH130000000"]) {
    assert.equal(canSelectVideoRegion(region), true);
    assert.throws(() => resolveVideoRegion(region, ""), /select a valid region/);
    assert.throws(() => resolveVideoRegion(region, "invalid"), /select a valid region/);
    assert.equal(resolveVideoRegion(region, "R8"), "R8");
  }
});

test("regional admins use their assigned region regardless of submitted values", () => {
  assert.equal(canSelectVideoRegion("Region VIII"), false);
  assert.equal(resolveVideoRegion("Region VIII", "R1"), "R8");
  assert.equal(resolveVideoRegion("R8", null), "R8");
});

test("admins without a region must choose one, and unknown assignments fail closed", () => {
  assert.throws(() => resolveVideoRegion(null, null), /select a valid region/);
  assert.equal(resolveVideoRegion(null, "NCR"), "NCR");
  assert.throws(() => resolveVideoRegion("unknown", "R1"), /select a valid region/);
});
