// Rebuilds public/data/ph-provinces.json from the per-region province files in
// https://github.com/faeldon/philippines-json-maps (MIT licensed).
//
// Why province-level instead of the single dissolved region-level file: that
// region-level file has no separate Negros Island Region (NIR) polygon - Negros
// Occidental and Negros Oriental are drawn as part of Region VI and Region VII.
// InfraWatch's own project data tracks NIR as its own region (see
// mapDbRegionToLabel in actions/query/analytics.query.ts), so we render at
// province granularity and re-tag those two provinces as NIR, letting the map
// show it as its own hoverable shape instead of folding it into VI/VII.
//
// Usage: node scripts/build-ph-provinces-geojson.mjs
// Re-run this if the upstream source publishes an update.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const SOURCE_BASE =
  "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/regions/lowres";

// Must match PHILIPPINE_REGIONS in lib/philippines-regions.ts.
const REGION_CODES_BY_PSGC = {
  100000000: "R1",
  200000000: "R2",
  300000000: "R3",
  400000000: "R4A",
  500000000: "R5",
  600000000: "R6",
  700000000: "R7",
  800000000: "R8",
  900000000: "R9",
  1000000000: "R10",
  1100000000: "R11",
  1200000000: "R12",
  1300000000: "NCR",
  1400000000: "CAR",
  1600000000: "R13",
  1700000000: "R4B",
  1900000000: "BARMM",
};

const NIR_PROVINCES = new Set(["Negros Occidental", "Negros Oriental"]);

async function main() {
  const features = [];

  for (const psgc of Object.keys(REGION_CODES_BY_PSGC)) {
    const url = `${SOURCE_BASE}/provdists-region-${psgc}.0.001.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    const data = await response.json();

    for (const feature of data.features) {
      const provinceName = feature.properties.adm2_en;
      const regionCode = NIR_PROVINCES.has(provinceName)
        ? "NIR"
        : REGION_CODES_BY_PSGC[feature.properties.adm1_psgc];

      if (!regionCode) {
        throw new Error(`No region code mapping for adm1_psgc ${feature.properties.adm1_psgc}`);
      }

      features.push({
        type: "Feature",
        properties: {
          map_region_code: regionCode,
          province: provinceName,
        },
        geometry: feature.geometry,
      });
    }
  }

  const output = { type: "FeatureCollection", features };
  const outPath = join(process.cwd(), "public", "data", "ph-provinces.json");
  await writeFile(outPath, JSON.stringify(output), "utf8");
  console.log(`Wrote ${features.length} province features to ${outPath}`);

  const nirCount = features.filter((f) => f.properties.map_region_code === "NIR").length;
  if (nirCount !== 2) {
    throw new Error(`Expected exactly 2 NIR provinces (Negros Occidental, Negros Oriental), found ${nirCount}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
