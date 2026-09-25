import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeoFeatureCollection } from "@/lib/geojson-to-svg-path";

let cached: GeoFeatureCollection | null = null;

/**
 * Server-only: reads the bundled PH province boundaries once per server process.
 * See public/data/ph-provinces.SOURCE.md for provenance, licensing, and why this
 * is province-level rather than a single polygon per region.
 *
 * Returns null (instead of throwing) if the file is missing or malformed, so a
 * packaging problem with this decorative asset never takes down the homepage.
 */
export async function getPhilippineProvincesGeoJson(): Promise<GeoFeatureCollection | null> {
  if (cached) return cached;
  try {
    const filePath = join(process.cwd(), "public", "data", "ph-provinces.json");
    const raw = await readFile(filePath, "utf8");
    cached = JSON.parse(raw) as GeoFeatureCollection;
    return cached;
  } catch (error) {
    console.error("[ph-provinces-geojson] Failed to load province boundaries:", error);
    return null;
  }
}
