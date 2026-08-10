import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, desc, ilike, or } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 10), 25);
  const conditions = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(projects.name, pattern),
        ilike(projects.abemisId, pattern),
        ilike(projects.projectCode, pattern),
        ilike(projects.province, pattern),
        ilike(projects.municipality, pattern),
      ),
    );
  }

  const rows = await db
    .select({
      id: projects.abemisId,
      name: projects.name,
      code: projects.projectCode,
      sourceId: projects.abemisId,
      province: projects.province,
      municipality: projects.municipality,
    })
    .from(projects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(projects.lastSyncedAt))
    .limit(limit);

  return NextResponse.json({
    success: true,
    data: rows,
  });
}
