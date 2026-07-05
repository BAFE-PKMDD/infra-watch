import { NextRequest, NextResponse } from "next/server";

import { getRecentSyncLogs, getSyncStatistics } from "@/lib/abemis/sync";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requirePermission(user.role as string | null | undefined, "abemis_sync", "view");

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    const includeStats = request.nextUrl.searchParams.get("includeStats") === "true";
    const logs = await getRecentSyncLogs(limit);
    const statistics = includeStats ? await getSyncStatistics() : undefined;

    return NextResponse.json({
      success: true,
      logs,
      statistics,
      total: logs.length,
    });
  } catch (error) {
    const status = error instanceof Error && (error as Error & { status?: number }).status ? (error as Error & { status: number }).status : 500;

    return NextResponse.json(
      {
        error: status === 403 ? "Forbidden" : "Failed to fetch sync logs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}
