import { count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { mapLayers } from "@/lib/db/schema";
import { httpUrl } from "@/lib/content-models";

const geoserverUrl = process.env.NEXT_PUBLIC_GEOSERVER_URL;
if (!geoserverUrl) {
  console.log(
    "No legacy GeoServer URL configured. Add layers in the Map Layers admin page.",
  );
  process.exit(0);
}
httpUrl.parse(geoserverUrl);
const workspace = process.env.NEXT_PUBLIC_GEOSERVER_WORKSPACE || "geoagri";
const legacyLayers = [
  ["Watersheds / Waterways", "WATERWAYS", 0.7],
  ["Agricultural Production Areas", "BSWM_AGRI_PROD_AREA", 0.6],
  ["Postharvest Facilities", "infra_postharverst_facilities", 0.85],
  ["Rice Processing Centers", "rice_processing_center", 0.85],
  ["Agricultural Trading Centers", "AMAS_TRADING_CENTERS", 0.85],
  ["Agricultural Processing Centers", "Agri Processing Centers", 0.85],
  ["Existing Agricultural Production Area", "exisiting_agri_prod_area", 0.5],
] as const;
const seeded = await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(3101002)`);
  const [existing] = await tx.select({ total: count() }).from(mapLayers);
  if (existing.total > 0) return false;
  await tx.insert(mapLayers).values(
    legacyLayers.map(([name, layerName, opacity], displayOrder) => ({
      name,
      layerName,
      opacity,
      displayOrder,
      geoserverUrl,
      workspace,
      description:
        "Imported from the previous infrastructure map configuration. Set the legend to match the GeoServer style.",
      createdBy: "system-map-layer-migration",
    })),
  );
  return true;
});
console.log(
  seeded
    ? "Imported seven existing GeoServer overlays into Map Layers."
    : "Map Layers already has entries. No layers were changed.",
);
process.exit(0);
