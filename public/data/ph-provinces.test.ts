import assert from "node:assert/strict";
import { test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PHILIPPINE_REGIONS } from "@/lib/philippines-regions";

const data = JSON.parse(
  readFileSync(join(process.cwd(), "public", "data", "ph-provinces.json"), "utf8"),
) as { type: string; features: Array<{ properties: { map_region_code: string; province: string } }> };

test("every feature's map_region_code is a known RegionCode", () => {
  const knownCodes = new Set(PHILIPPINE_REGIONS.map((r) => r.code));
  for (const feature of data.features) {
    assert.ok(
      knownCodes.has(feature.properties.map_region_code as never),
      `Unknown region code "${feature.properties.map_region_code}" on province "${feature.properties.province}"`,
    );
  }
});

test("Negros Occidental and Negros Oriental are tagged NIR, not R6/R7", () => {
  const negrosProvinces = data.features.filter((f) =>
    f.properties.province === "Negros Occidental" || f.properties.province === "Negros Oriental",
  );
  assert.equal(negrosProvinces.length, 2);
  for (const feature of negrosProvinces) {
    assert.equal(feature.properties.map_region_code, "NIR");
  }
});

test("every declared RegionCode has at least one province shape on the map", () => {
  const codesOnMap = new Set(data.features.map((f) => f.properties.map_region_code));
  for (const region of PHILIPPINE_REGIONS) {
    assert.ok(codesOnMap.has(region.code), `No province shape found for ${region.code} (${region.displayName})`);
  }
});
