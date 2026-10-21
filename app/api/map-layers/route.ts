import { getActiveMapLayers } from "@/lib/content-management";
import { cachedPublic } from "@/lib/cache";

export async function GET() {
  return Response.json(
    { data: await cachedPublic("map-layers", 60, () => getActiveMapLayers()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
