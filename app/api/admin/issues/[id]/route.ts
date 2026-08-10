import { NextRequest, NextResponse } from "next/server";

import { formatAdminIssue, getIssueByIdOrTicket, getIssueResponses, requireIssuePermission } from "@/lib/admin-issues";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { checkIssueScope } from "@/lib/scope";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireIssuePermission(request, "read");
    const { id } = await params;
    const row = await getIssueByIdOrTicket(id);

    if (!row) {
      return NextResponse.json({ success: false, error: "Issue not found" }, { status: 404 });
    }

    const scopeCheck = await checkIssueScope(user, row);
    if (!scopeCheck.allowed) {
      return NextResponse.json({ success: false, error: `Forbidden: ${scopeCheck.reason}` }, { status: 403 });
    }

    const responses = await getIssueResponses(row.id, true);

    return NextResponse.json({
      success: true,
      data: {
        ...formatAdminIssue(row),
        responses,
      },
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to load issue" }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireIssuePermission(request, "delete");
    const { id } = await params;
    const row = await getIssueByIdOrTicket(id);

    if (!row) {
      return NextResponse.json({ success: false, error: "Issue not found" }, { status: 404 });
    }

    const scopeCheck = await checkIssueScope(user, row);
    if (!scopeCheck.allowed) {
      return NextResponse.json({ success: false, error: `Forbidden: ${scopeCheck.reason}` }, { status: 403 });
    }

    await db.delete(issues).where(eq(issues.id, row.id));

    await logAudit({
      tableName: "issues",
      recordId: row.id,
      action: "DELETE",
      oldValues: {
        id: row.id,
        ticketNumber: row.ticketNumber,
        projectId: row.projectId,
        reporterUserId: row.reporterUserId,
        isAnonymous: row.isAnonymous,
        category: row.category,
        status: row.status,
        priority: row.priority,
        region: row.region,
        province: row.province,
        municipality: row.municipality,
        barangay: row.barangay,
      },
      notes: `Issue ${row.ticketNumber} deleted`,
      context: getAuditContextFromRequest(request, user),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to delete issue" }, { status });
  }
}
