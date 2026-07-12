"use server";

import { db } from "@/lib/db";
import { psgcLocations } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { PUBLIC_STAGES } from "@/constants/stage-mapping";


export type LocationOption = {
  label: string;
  value: string;
};

// Cache helpers
const CACHE_TTL = 3600; // 1 hour

/**
 * Helper to slugify a string to match the project query logic
 * Logic: LOWER(REPLACE(col, ' ', '-'))
 */
function toSlug(value: string | null): string {
  if (!value) return "";
  return value.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Helper to convert Title Case to Sentence Case or similar if needed.
 * For now, we return the DB value as label.
 */
function toLabel(value: string): string {
  return value; // Can add capitalization logic here if PSGC is all caps
}

/**
 * Get all available regions
 */
/**
 * Get all available regions
 */
export async function getRegions() {
  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const regions = await db
        .selectDistinct({
          name: psgcLocations.regionName,
          code: psgcLocations.regCode1,
        })
        .from(psgcLocations)
        .orderBy(asc(psgcLocations.regionName));

      const uniqueMap = new Map<string, LocationOption>();

      regions.forEach(r => {
        if (r.name && r.code && !uniqueMap.has(r.code)) {
          // TODO: To fix this more permanently later, we should consider using geoCode instead of regCode1 (geo_code1)
          // as the primary identifier for regions to avoid mapping inconsistencies in the source data.
          let label = r.name;

          // Override inconsistent database names
          if (r.code === "12") {
            label = "REGION XII (SOCCSKSARGEN)";
          } else if (r.code === "15") {
            label = "BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO (BARMM)";
          }

          uniqueMap.set(r.code, {
            label: label,
            value: r.code
          });
        }
      });

      // Custom sort order for Philippine regions
      // IV-B (17) should come after IV-A (04), XIII (13) should come after XII (12)
      const regionOrder: Record<string, number> = {
        "01": 1,  // Region I
        "02": 2,  // Region II
        "03": 3,  // Region III
        "04": 4,  // Region IV-A
        "17": 5,  // Region IV-B (MIMAROPA)
        "05": 6,  // Region V
        "06": 7,  // Region VI
        "07": 8,  // Region VII
        "08": 9,  // Region VIII
        "09": 10, // Region IX
        "10": 11, // Region X
        "11": 12, // Region XI
        "12": 13, // Region XII
        "13": 16, // Region XIII (Caraga)
        "14": 15, // CAR
        "16": 13, // NCR
        "15": 17, // BARMM
      };

      return Array.from(uniqueMap.values()).sort((a, b) => {
        const orderA = regionOrder[a.value] ?? parseInt(a.value);
        const orderB = regionOrder[b.value] ?? parseInt(b.value);
        return orderA - orderB;
      });
    },
    ["location-regions-codes-v3"],
    { revalidate: CACHE_TTL }
  )();
}

/**
 * Get provinces for a specific region
 * @param regionCode - The region code (regCode1 e.g. "01")
 */
export async function getProvinces(regionCode: string) {
  if (!regionCode || regionCode === "all") return [];

  return unstable_cache(
    async (): Promise<LocationOption[]> => {
      const provinces = await db
        .selectDistinct({
          name: psgcLocations.provinceName,
          regCode: psgcLocations.regCode1,
          provCode: psgcLocations.provCode1,
        })
        .from(psgcLocations)
        .where(eq(psgcLocations.regCode1, regionCode))
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
    [`location-provinces-code-v2-${regionCode}`],
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
