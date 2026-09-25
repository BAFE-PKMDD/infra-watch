# ph-provinces.json

Source: [philippines-json-maps](https://github.com/faeldon/philippines-json-maps) by James Faeldon, MIT licensed.
Built by `scripts/build-ph-provinces-geojson.mjs` from the 17 per-region province files at
`2023/geojson/regions/lowres/provdists-region-*.0.001.json` (simplification tolerance 0.001).

Rendered at province level (not the single dissolved region-level file) specifically so
Negros Occidental and Negros Oriental can be re-tagged as their own "NIR" (Negros Island
Region) group - the upstream region-level boundary file has no separate NIR polygon, since
it reflects the current PSGC administrative structure where those two provinces are part of
Region VI and Region VII. InfraWatch's own project data tracks NIR as its own region (see
`mapDbRegionToLabel` in `actions/query/analytics.query.ts`), so the homepage map does too.

Each feature carries `map_region_code` (matching `RegionCode` in `lib/philippines-regions.ts`)
and `province` (the province/district name) - re-run the build script if the upstream source
publishes an update.
