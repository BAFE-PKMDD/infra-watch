import { NextRequest, NextResponse } from "next/server";

import { syncAbemisProjects } from "@/lib/abemis/sync";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

function getSyncResultMessage(status: string) {
  if (status === "skipped") return "Sync skipped: another sync is already running.";
  if (status === "completed_with_warnings") return "Sync completed with a small number of failed records.";
  if (status === "failed") return "Sync completed with errors";
  return "Sync completed successfully";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requirePermission(user.role as string | null | undefined, "abemis_sync", "trigger");

    const body = await request.json().catch(() => ({}));
    const result = await syncAbemisProjects({
      syncType: body.syncType ?? "manual",
      triggeredBy: String(user.id),
    });

    await logAudit({
      tableName: "sync_logs",
      recordId: result.syncLogId,
      action: "CREATE",
      newValues: {
        syncLogId: result.syncLogId,
        success: result.success,
        status: result.status,
        statistics: result.statistics,
        duration: result.duration,
        errors: result.errors,
      },
      notes: `ABEMIS sync ${result.status}`,
      context: getAuditContextFromRequest(request, user),
    });

    return NextResponse.json(
      {
        success: result.success,
        message: getSyncResultMessage(result.status),
        syncLogId: result.syncLogId,
        statistics: result.statistics,
        duration: result.duration,
        errors: result.errors,
      },
      { status: 200 },
    );
  } catch (error) {
    const status = error instanceof Error && (error as Error & { status?: number }).status ? (error as Error & { status: number }).status : 500;

    return NextResponse.json(
      {
        error: status === 403 ? "Forbidden" : "Failed to run sync",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requirePermission(user.role as string | null | undefined, "abemis_sync", "view");

    return NextResponse.json({
      status: "ready",
      message: "ABEMIS sync service is ready",
    });
  } catch (error) {
    const status = error instanceof Error && (error as Error & { status?: number }).status ? (error as Error & { status: number }).status : 500;

    return NextResponse.json(
      {
        error: status === 403 ? "Forbidden" : "Failed to read sync status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status },
    );
  }
}
