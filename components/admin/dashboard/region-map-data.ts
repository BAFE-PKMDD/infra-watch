// Pure data and logic for the region map, kept free of any Leaflet import so it can be
// unit tested in Node — importing "leaflet" itself outside a browser throws at module
// load time, before any component even renders.

// Maps this app's exact live region-name strings (as stored on projects.region) to the
// region-level PSGC code used in public/boundaries/regions.json. Built and verified
// against the actual distinct values in the projects table, not guessed or fuzzy-matched,
// so an unrecognized future region name falls back to an honest "no boundary data" fill
// rather than a silent mismatch.
//
// BARMM maps to the boundary file's pre-2019 "ARMM" polygon: same territory, renamed in
// the 2018 Bangsamoro Organic Law, not a different region.
export const LIVE_REGION_TO_PSGC: Record<string, string> = {
  "National Capital Region (NCR)": "PH130000000",
  "Cordillera Administrative Region (CAR)": "PH140000000",
  "Ilocos Region (Region I)": "PH010000000",
  "Cagayan Valley (Region II)": "PH020000000",
  "Central Luzon (Region III)": "PH030000000",
  "CALABARZON (Region IV-A)": "PH040000000",
  "MIMAROPA (Region IV-B)": "PH170000000",
  "Bicol Region (Region V)": "PH050000000",
  "Western Visayas (Region VI)": "PH060000000",
  "Central Visayas (Region VII)": "PH070000000",
  "Eastern Visayas (Region VIII)": "PH080000000",
  "Zamboanga Peninsula (Region IX)": "PH090000000",
  "Northern Mindanao (Region X)": "PH100000000",
  "Davao Region (Region XI)": "PH110000000",
  "SOCCSKSARGEN (Region XII)": "PH120000000",
  "Caraga (Region XIII)": "PH160000000",
  "Negros Island Region (NIR)": "PH180000000",
  "Bangsamoro Autonomous Region of Muslim Mindanao (BARMM)": "PH150000000",
};

export const PSGC_TO_LIVE_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(LIVE_REGION_TO_PSGC).map(([region, code]) => [code, region]),
);

export function delayedRateFillColor(delayedRate: number) {
  if (delayedRate <= 0) return "#dcfce7";
  if (delayedRate < 10) return "#fecaca";
  if (delayedRate < 25) return "#fca5a5";
  if (delayedRate < 50) return "#f87171";
  if (delayedRate < 75) return "#ef4444";
  return "#b91c1c";
}

export const NOT_ASSESSED_FILL = "#e2e8f0";
export const NO_MATCH_FILL = "#f1f5f9";
