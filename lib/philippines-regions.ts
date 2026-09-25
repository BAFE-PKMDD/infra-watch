/**
 * Region-code join key shared with `mapDbRegionToLabel` in
 * actions/query/analytics.query.ts, so the homepage map and the existing
 * regional stats aggregation always agree on what a "region" is.
 *
 * Includes "NIR" (Negros Island Region): public/data/ph-provinces.json is built
 * at province granularity specifically so Negros Occidental and Negros Oriental
 * can be re-tagged as NIR instead of folded into Region VI/VII - see
 * scripts/build-ph-provinces-geojson.mjs and its SOURCE.md for why.
 */
export type RegionCode =
  | "NCR" | "CAR" | "R1" | "R2" | "R3" | "R4A" | "R4B" | "R5" | "R6" | "R7"
  | "R8" | "R9" | "R10" | "R11" | "R12" | "R13" | "BARMM" | "NIR";

export interface PhilippineRegion {
  code: RegionCode;
  shortLabel: string;
  displayName: string;
}

export const PHILIPPINE_REGIONS: PhilippineRegion[] = [
  { code: "R1", shortLabel: "Region I", displayName: "Ilocos Region (Region I)" },
  { code: "R2", shortLabel: "Region II", displayName: "Cagayan Valley (Region II)" },
  { code: "R3", shortLabel: "Region III", displayName: "Central Luzon (Region III)" },
  { code: "R4A", shortLabel: "Region IV-A", displayName: "CALABARZON (Region IV-A)" },
  { code: "R5", shortLabel: "Region V", displayName: "Bicol Region (Region V)" },
  { code: "R6", shortLabel: "Region VI", displayName: "Western Visayas (Region VI)" },
  { code: "R7", shortLabel: "Region VII", displayName: "Central Visayas (Region VII)" },
  { code: "R8", shortLabel: "Region VIII", displayName: "Eastern Visayas (Region VIII)" },
  { code: "R9", shortLabel: "Region IX", displayName: "Zamboanga Peninsula (Region IX)" },
  { code: "R10", shortLabel: "Region X", displayName: "Northern Mindanao (Region X)" },
  { code: "R11", shortLabel: "Region XI", displayName: "Davao Region (Region XI)" },
  { code: "R12", shortLabel: "Region XII", displayName: "SOCCSKSARGEN (Region XII)" },
  { code: "NCR", shortLabel: "NCR", displayName: "National Capital Region (NCR)" },
  { code: "CAR", shortLabel: "CAR", displayName: "Cordillera Administrative Region (CAR)" },
  { code: "R13", shortLabel: "Region XIII", displayName: "Caraga (Region XIII)" },
  { code: "R4B", shortLabel: "Region IV-B", displayName: "MIMAROPA (Region IV-B)" },
  { code: "BARMM", shortLabel: "BARMM", displayName: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)" },
  { code: "NIR", shortLabel: "NIR", displayName: "Negros Island Region (NIR)" },
];

export const PHILIPPINE_REGION_BY_CODE = new Map(PHILIPPINE_REGIONS.map((r) => [r.code, r]));
