/**
 * Location Synchronization Service
 * Handles syncing location data from PSGC API to local database
 */

import { db } from "@/lib/db";
import { psgcLocations, syncLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { fetchAllPsgcLocations, type PsgcApiLocation } from "./client";

export interface LocationSyncOptions {
  triggeredBy?: string;
  onProgress?: (current: number, total: number, status: string) => void;
}

export interface LocationSyncResult {
  success: boolean;
  syncLogId: string;
  totalProcessed: number;
  duration: number;
  error?: string;
}

/**
 * Main function to sync locations from PSGC
 */
export async function syncPsgcLocations(options: LocationSyncOptions = {}): Promise<LocationSyncResult> {
  const { triggeredBy = "system", onProgress } = options;
  const startTime = Date.now();

  // Create sync log
  const [syncLog] = await db.insert(syncLogs).values({
    syncType: "manual",
    resource: "location",
    status: "running",
    triggeredBy,
    startedAt: new Date(),
  }).returning();

  const syncLogId = syncLog.id;
  let totalProcessed = 0;

  try {
    if (onProgress) onProgress(0, 0, "Fetching locations from PSGC API...");

    const locationsData = await fetchAllPsgcLocations();

    // Deduplicate by geoCode to avoid Postgres "ON CONFLICT" errors within the same batch
    const uniqueLocationsMap = new Map<string, PsgcApiLocation>();
    for (const loc of locationsData) {
      if (loc.geo_code) {
        uniqueLocationsMap.set(loc.geo_code, loc);
      }
    }
    const locations = Array.from(uniqueLocationsMap.values());
    const totalCount = locations.length;

    if (onProgress) onProgress(0, totalCount, `Fetched ${locationsData.length} total, ${totalCount} unique locations. Starting upsert...`);

    // Process in batches for performance
    // Using 500 as a safer batch size for transaction stability
    const BATCH_SIZE = 500;
    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
      const batch = locations.slice(i, i + BATCH_SIZE);

      const valuesToUpsert = batch.map(loc => {
        const lat = loc.lat ? parseFloat(loc.lat) : null;
        const lng = loc.long ? parseFloat(loc.long) : null;

        return {
          geoCode: loc.geo_code,
          geoCode1: loc.geo_code1 || null,
          regionName: loc.reg_name || "Unknown",
          regionShortname: loc.reg_shortname || null,
          provinceName: loc.prov_name || null,
          municipalityName: loc.mun_name || null,
          barangayName: loc.bgy_name || null,
          regionCode: loc.reg_code || null,
          provinceCode: loc.prov_code || null,
          municipalityCode: loc.mun_code || null,
          barangayCode: loc.bgy_code || null,
          phcodeReg: loc.phcode_reg || null,
          phcodeProv: loc.phcode_prov || null,
          phcodeMun: loc.phcode_mun || null,
          phcodeBgy: loc.phcode_bgy || null,
          regCode1: loc.reg_code1 || null,
          provCode1: loc.prov_code1 || null,
          munCode1: loc.mun_code1 || null,
          bgyCode1: loc.bgy_code1 || null,
          distCode: loc.dist_code || null,
          district: loc.district || null,
          cityClass: loc.city_class || null,
          latitude: (lat !== null && !isNaN(lat)) ? lat : null,
          longitude: (lng !== null && !isNaN(lng)) ? lng : null,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        };
      });

      if (valuesToUpsert.length === 0) continue;

      try {
        // Perform batch upsert
        await db.insert(psgcLocations)
          .values(valuesToUpsert)
          .onConflictDoUpdate({
            target: psgcLocations.geoCode,
            set: {
              geoCode1: sql`EXCLUDED.geo_code1`,
              regionName: sql`EXCLUDED.region_name`,
              regionShortname: sql`EXCLUDED.reg_shortname`,
              provinceName: sql`EXCLUDED.province_name`,
              municipalityName: sql`EXCLUDED.municipality_name`,
              barangayName: sql`EXCLUDED.barangay_name`,
              regionCode: sql`EXCLUDED.region_code`,
              provinceCode: sql`EXCLUDED.province_code`,
              municipalityCode: sql`EXCLUDED.municipality_code`,
              barangayCode: sql`EXCLUDED.barangay_code`,
              phcodeReg: sql`EXCLUDED.phcode_reg`,
              phcodeProv: sql`EXCLUDED.phcode_prov`,
              phcodeMun: sql`EXCLUDED.phcode_mun`,
              phcodeBgy: sql`EXCLUDED.phcode_bgy`,
              regCode1: sql`EXCLUDED.reg_code1`,
              provCode1: sql`EXCLUDED.prov_code1`,
              munCode1: sql`EXCLUDED.mun_code1`,
              bgyCode1: sql`EXCLUDED.bgy_code1`,
              distCode: sql`EXCLUDED.dist_code`,
              district: sql`EXCLUDED.district`,
              cityClass: sql`EXCLUDED.city_class`,
              latitude: sql`EXCLUDED.latitude`,
              longitude: sql`EXCLUDED.longitude`,
              lastSyncedAt: sql`EXCLUDED.last_synced_at`,
              updatedAt: sql`EXCLUDED.updated_at`,
            }
          });

        totalProcessed += batch.length;
        if (onProgress) onProgress(totalProcessed, totalCount, `Synced ${totalProcessed} of ${totalCount} locations`);
      } catch (batchError) {
        console.error(`Error in batch ${i / BATCH_SIZE}:`, batchError);
        // We throw to catch in the main try-catch and mark the entire sync as failed
        // but with better context in the logs
        throw new Error(`Batch insertion failed at index ${i}: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
      }
    }

    const duration = Date.now() - startTime;

    // Update sync log
    await db.update(syncLogs).set({
      status: "completed",
      totalProcessed,
      completedAt: new Date(),
      duration,
    }).where(eq(syncLogs.id, syncLogId));

    return {
      success: true,
      syncLogId,
      totalProcessed,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.update(syncLogs).set({
      status: "failed",
      totalProcessed,
      errorDetails: errorMessage,
      completedAt: new Date(),
      duration,
    }).where(eq(syncLogs.id, syncLogId));

    return {
      success: false,
      syncLogId,
      totalProcessed,
      duration,
      error: errorMessage,
    };
  }
}
