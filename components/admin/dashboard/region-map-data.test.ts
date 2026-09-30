import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "bun:test";

import { LIVE_REGION_TO_PSGC, PSGC_TO_LIVE_REGION, delayedRateFillColor } from "./region-map-data";

test("maps every live region name to a distinct PSGC code", () => {
  const entries = Object.entries(LIVE_REGION_TO_PSGC);
  assert.equal(entries.length, 18);
  const codes = entries.map(([, code]) => code);
  assert.equal(new Set(codes).size, codes.length, "no two region names should share a PSGC code");
  assert.equal(Object.keys(PSGC_TO_LIVE_REGION).length, entries.length);
});

test("every mapped PSGC code actually exists in the boundary file (catches a typo silently breaking a region)", () => {
  const boundaries = JSON.parse(
    readFileSync(join(process.cwd(), "public/boundaries/regions.json"), "utf-8"),
  ) as { features: Array<{ properties: { psgc_code: string } }> };
  const boundaryCodes = new Set(boundaries.features.map((feature) => feature.properties.psgc_code));

  for (const [region, code] of Object.entries(LIVE_REGION_TO_PSGC)) {
    assert.ok(boundaryCodes.has(code), `${region} maps to ${code}, which is not in public/boundaries/regions.json`);
  }
});

test("colors an unassessed-free zero delayed rate distinctly from a genuine high rate", () => {
  assert.equal(delayedRateFillColor(0), "#dcfce7");
  assert.equal(delayedRateFillColor(5), "#fecaca");
  assert.equal(delayedRateFillColor(24.9), "#fca5a5");
  assert.equal(delayedRateFillColor(49.9), "#f87171");
  assert.equal(delayedRateFillColor(74.9), "#ef4444");
  assert.equal(delayedRateFillColor(100), "#b91c1c");
});
