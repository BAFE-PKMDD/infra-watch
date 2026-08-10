import { NextRequest, NextResponse } from "next/server";

import { getAuditLogs } from "@/actions/query/audit-logs.query";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await getAuditLogs({
    page: Number(params.get("page") ?? 1),
    limit: Number(params.get("limit") ?? 50),
    source: params.get("source")?.trim() || params.get("tableName")?.trim() || undefined,
    group: params.get("group")?.trim() || undefined,
    action: params.get("action")?.trim() || undefined,
    category: params.get("category")?.trim() || undefined,
    fromDate: params.get("fromDate")?.trim() || undefined,
    toDate: params.get("toDate")?.trim() || undefined,
    search: params.get("search")?.trim() || undefined,
  });

  return NextResponse.json(result, { status: result.success ? 200 : result.status ?? 500 });
}
