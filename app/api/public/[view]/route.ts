import { NextResponse, type NextRequest } from "next/server";

import { applyFilters, parseFilters, searchPlaces } from "@/lib/public-analytics/aggregate";
import { getPublicProjectSnapshot } from "@/lib/public-analytics/service";
import { VIEW_BUILDERS, type ViewName } from "@/lib/public-analytics/views";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" };

export async function GET(request: NextRequest, context: { params: Promise<{ view: string }> }) {
  const { view } = await context.params;
  const searchParams = request.nextUrl.searchParams;

  try {
    const { rows, dataAsOf } = await getPublicProjectSnapshot();
    const filters = parseFilters(searchParams);
    const filtered = applyFilters(rows, filters);

    if (view === "places") {
      const query = (searchParams.get("q") ?? "").slice(0, 100);
      return NextResponse.json({ data: searchPlaces(filtered, query) }, { headers: CACHE_HEADERS });
    }

    if (!(view in VIEW_BUILDERS)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = VIEW_BUILDERS[view as ViewName](filtered, filters);
    return NextResponse.json({ data, dataAsOf: dataAsOf?.toISOString() ?? null, filters }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error(`Public analytics view ${view} failed`, error);
    return NextResponse.json({ error: "Project data is temporarily unavailable." }, { status: 503 });
  }
}
