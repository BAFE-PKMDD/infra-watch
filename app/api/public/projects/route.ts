import { NextResponse, type NextRequest } from "next/server";

import { applyFilters, listProjects, parseFilters } from "@/lib/public-analytics/aggregate";
import { getPublicProjectSnapshot } from "@/lib/public-analytics/service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // CSV export is switched off while the project data is still being cleansed. To
  // re-enable it, return toCsv(result.all, ...) here again (toCsv is still in
  // lib/public-analytics/aggregate.ts).
  if (searchParams.get("format") === "csv") {
    return NextResponse.json(
      { error: "CSV export is not available yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { rows } = await getPublicProjectSnapshot();
    const filtered = applyFilters(rows, parseFilters(searchParams));
    const result = listProjects(filtered, {
      query: searchParams.get("q")?.slice(0, 100),
      sort: searchParams.get("sort"),
      direction: searchParams.get("dir"),
      page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
      pageSize: Number.parseInt(searchParams.get("pageSize") ?? "25", 10) || 25,
    });

    const { all: _all, ...page } = result;
    void _all;
    return NextResponse.json(
      {
        ...page,
        rows: page.rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          projectType: row.projectType,
          municipality: row.municipality,
          province: row.province,
          year: row.year,
          stage: row.stage,
          budget: row.budget,
        })),
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Public project list failed", error);
    return NextResponse.json({ error: "Project data is temporarily unavailable." }, { status: 503 });
  }
}
