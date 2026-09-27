import { NextResponse } from "next/server";

import { getPublicProjectDetail } from "@/lib/public-analytics/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const project = await getPublicProjectDetail(id.slice(0, 100));
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: project }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Public project detail failed", error);
    return NextResponse.json({ error: "Project data is temporarily unavailable." }, { status: 503 });
  }
}
