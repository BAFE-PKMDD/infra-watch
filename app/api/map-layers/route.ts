import { getActiveMapLayers } from "@/lib/content-management";

export async function GET() {
  return Response.json(
    { data: await getActiveMapLayers() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
