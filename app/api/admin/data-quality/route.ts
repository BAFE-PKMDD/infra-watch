import { NextRequest, NextResponse } from "next/server";

import { getDataQualityReport } from "@/lib/data-quality/service";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission(user.role as string | null | undefined, "data_quality", "view");

    const params = request.nextUrl.searchParams;
    const report = await getDataQualityReport({
      type: params.get("type") ?? undefined,
      search: params.get("search") ?? undefined,
      page: Number(params.get("page") ?? 1),
      pageSize: Number(params.get("pageSize") ?? 25),
    }, user);

    return NextResponse.json({ success: true, ...report }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status = getErrorStatus(error);
    return NextResponse.json({
      error: status === 403 ? "Forbidden" : "Failed to analyze project data",
    }, { status });
  }
}

function getErrorStatus(error: unknown) {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return error.status;
  }
  return 500;
}
