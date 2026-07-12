import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { requireIssuePermission } from "@/lib/admin-issues";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { getIssueScopeCondition } from "@/lib/scope";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireIssuePermission(request, "list");
    const whereClause = await getIssueScopeCondition(user);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${issues.status} in ('pending', 'submitted'))::int`,
        reviewing: sql<number>`count(*) filter (where ${issues.status} = 'reviewing')::int`,
        resolved: sql<number>`count(*) filter (where ${issues.status} = 'resolved')::int`,
        closed: sql<number>`count(*) filter (where ${issues.status} = 'closed')::int`,
      })
      .from(issues)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: stats ?? { total: 0, pending: 0, reviewing: 0, resolved: 0, closed: 0 },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load issue stats" }, { status });
  }
}
