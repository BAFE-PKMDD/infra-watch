"use server";

import { db } from "@/lib/db";
import { projects, psgcLocations } from "@/lib/db/schema";
import { asc, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { PUBLIC_STAGES } from "@/constants/stage-mapping";


export type LocationOption = {
  label: string;
  value: string;
};

// Cache helpers
const CACHE_TTL = 3600; // 1 hour


// The upstream PSGC API reuses the same 2-digit regCode1 across genuinely different
// regions (e.g. Negros Occidental keeps Region VI's "06" and Negros Oriental keeps
// Region VII's "07" even though both are tagged region_name "NEGROS ISLAND REGION
// (NIR)"; BARMM rows are similarly split across regCode1 "12" and "15"). regCode1
// alone can't identify a region, so we group by region_name instead and derive each
// region's "value" as the set of province-level (regCode1+provCode1) prefixes that
// actually carry that name — that's the finest granularity where e.g. Negros Occidental
// is distinguishable from the rest of Western Visayas despite sharing a region code.
const REGION_NAME_ORDER: Record<string, number> = {
  "REGION I (ILOCOS REGION)": 1,
  "REGION II (CAGAYAN VALLEY)": 2,
  "REGION III (CENTRAL LUZON)": 3,
  "REGION IV-A (CALABARZON)": 4,
  "REGION IV-B (MIMAROPA)": 5,
  "REGION V (BICOL REGION)": 6,
  "REGION VI (WESTERN VISAYAS)": 7,
  "NEGROS ISLAND REGION (NIR)": 8,
  "REGION VII (CENTRAL VISAYAS)": 9,
  "REGION VIII (EASTERN VISAYAS)": 10,
  "REGION IX (ZAMBOANGA PENINSULA)": 11,
  "REGION X (NORTHERN MINDANAO)": 12,
  "REGION XI (DAVAO REGION)": 13,
  "REGION XII (SOCCSKSARGEN)": 14,
  "REGION XIII (CARAGA)": 15,
  "CORDILLERA ADMINISTRATIVE REGION (CAR)": 16,
  "NATIONAL CAPITAL REGION (NCR)": 17,
  "BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO (BARMM)": 18,
};

/**
 * Get all available regions
 */
export async function getRegions() {
  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const rows = await db
        .selectDistinct({
          name: sql<string>`btrim(${psgcLocations.regionName})`,
          regCode: psgcLocations.regCode1,
          provCode: psgcLocations.provCode1,
        })
        .from(psgcLocations);

      const groups = new Map<string, Set<string>>();

      rows.forEach(r => {
        if (!r.name || !r.regCode || !r.provCode) return;
        if (!groups.has(r.name)) groups.set(r.name, new Set());
        groups.get(r.name)!.add(`${r.regCode}${r.provCode}`);
      });

      const regions = Array.from(groups.entries()).map(([name, prefixes]) => ({
        label: name,
        value: Array.from(prefixes).sort().join(","),
      }));

      return regions.sort((a, b) => {
        const orderA = REGION_NAME_ORDER[a.label] ?? 99;
        const orderB = REGION_NAME_ORDER[b.label] ?? 99;
        return orderA !== orderB ? orderA - orderB : a.label.localeCompare(b.label);
      });
    },
    ["location-regions-codes-v4"],
    { revalidate: CACHE_TTL }
  )();
}

/**
 * Get provinces for a specific region
 * @param regionValue - Comma-separated province-level prefixes (regCode1+provCode1) from getRegions()
 */
export async function getProvinces(regionValue: string) {
  if (!regionValue || regionValue === "all") return [];

  const prefixes = regionValue.split(",").filter(Boolean);
  if (prefixes.length === 0) return [];

  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const provinceKey = sql`${psgcLocations.regCode1} || ${psgcLocations.provCode1}`;

      const provinces = await db
        .selectDistinct({
          name: psgcLocations.provinceName,
          regCode: psgcLocations.regCode1,
          provCode: psgcLocations.provCode1,
        })
        .from(psgcLocations)
        .where(inArray(provinceKey, prefixes))
        .orderBy(asc(psgcLocations.provinceName));

      const uniqueMap = new Map<string, LocationOption>();

      provinces.forEach(p => {
        if (p.name && p.regCode && p.provCode) {
          const fullCode = `${p.regCode}${p.provCode}`;
          if (!uniqueMap.has(fullCode)) {
            uniqueMap.set(fullCode, {
              label: p.name,
              value: fullCode
            });
          }
        }
      });

      return Array.from(uniqueMap.values());
    },
    [`location-provinces-code-v3-${regionValue}`],
    { revalidate: CACHE_TTL }
  )();
}

/**
 * Get municipalities/cities for a specific province
 * @param provinceCode - The full province code (regCode1 + provCode1 e.g. "0128")
 */
export async function getMunicipalities(provinceCode: string) {
  if (!provinceCode || provinceCode === "all") return [];

  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const cities = await db
        .selectDistinct({
          name: psgcLocations.municipalityName,
          regCode: psgcLocations.regCode1,
          provCode: psgcLocations.provCode1,
          munCode: psgcLocations.munCode1,
        })
        .from(psgcLocations)
        .where(sql`${psgcLocations.geoCode1} LIKE ${`${provinceCode}%`}`)
        .orderBy(asc(psgcLocations.municipalityName));

      const uniqueMap = new Map<string, LocationOption>();

      cities.forEach(c => {
        if (c.name && c.regCode && c.provCode && c.munCode) {
          const fullCode = `${c.regCode}${c.provCode}${c.munCode}`;
          if (!uniqueMap.has(fullCode)) {
            uniqueMap.set(fullCode, {
              label: c.name,
              value: fullCode
            });
          }
        }
      });

      return Array.from(uniqueMap.values());
    },
    [`location-cities-code-v2-${provinceCode}`],
    { revalidate: CACHE_TTL }
  )();
}

/**
 * Get distinct project stages (Public terms)
 */

export async function getStages() {
  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      return PUBLIC_STAGES.map(stage => ({
        label: stage,
        value: stage
      }));
    },
    ["project-stages-v2"],
    { revalidate: CACHE_TTL }
  )();
}

/**
 * Get barangays for a specific city/municipality
 * @param cityCode - The city/municipality code (regCode1 + provCode1 + munCode1 e.g. "012821")
 */
export async function getBarangays(cityCode: string) {
  if (!cityCode || cityCode === "all") return [];

  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const barangays = await db
        .selectDistinct({
          name: psgcLocations.barangayName,
          code: psgcLocations.geoCode1,
        })
        .from(psgcLocations)
        .where(sql`${psgcLocations.geoCode1} LIKE ${`${cityCode}%`}`)
        .orderBy(asc(psgcLocations.barangayName));

      const uniqueMap = new Map<string, LocationOption>();

      barangays.forEach(b => {
        if (b.name && b.code && !uniqueMap.has(b.code)) {
          uniqueMap.set(b.code, {
            label: b.name,
            value: b.code
          });
        }
      });

      return Array.from(uniqueMap.values());
    },
    [`location-barangays-code-v2-${cityCode}`],
    { revalidate: CACHE_TTL }
  )();
}

/**
 * Get distinct project regions for routing/assignment dropdowns.
 *
 * Sourced from projects.region (the same free-text value moderator scoping matches
 * against in lib/scope.ts), not the PSGC region_code reference field used by
 * getRegions() above: that field isn't a reliable per-region key (e.g. BARMM and
 * SOCCSKSARGEN both have psgc_locations rows with region_code "19").
 */
export async function getProjectRegions() {
  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const rows = await db
        .selectDistinct({ region: projects.region })
        .from(projects)
        .where(sql`${projects.region} IS NOT NULL AND btrim(${projects.region}) <> ''`);

      return rows
        .map((r) => r.region!)
        .sort((a, b) => a.localeCompare(b))
        .map((region) => ({ label: region, value: region }));
    },
    ["project-regions-v1"],
    { revalidate: CACHE_TTL }
  )();
}
