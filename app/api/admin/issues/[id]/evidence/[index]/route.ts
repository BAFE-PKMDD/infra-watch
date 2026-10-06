import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getIssueByIdOrTicket, requireIssuePermission } from "@/lib/admin-issues";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { checkIssueScope } from "@/lib/scope";
import type { StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

export const runtime = "nodejs";

/**
 * Approve or withdraw a single evidence image for public display. The image
 * only becomes visible once the issue itself has a published public summary.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  try {
    const user = await requireIssuePermission(request, "respond");
    const { id, index: indexParam } = await params;
    const issue = await getIssueByIdOrTicket(id);

    if (!issue) {
      return NextResponse.json({ success: false, error: "Issue not found" }, { status: 404 });
    }

    const scopeCheck = await checkIssueScope(user, issue);
    if (!scopeCheck.allowed) {
      return NextResponse.json({ success: false, error: `Forbidden: ${scopeCheck.reason}` }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.approved !== "boolean") {
      return NextResponse.json({ success: false, error: "`approved` must be true or false." }, { status: 400 });
    }

    const index = Number(indexParam);
    const evidence: StoredIssueEvidenceItem[] = Array.isArray(issue.evidence) ? issue.evidence : [];
    const target = Number.isInteger(index) ? evidence[index] : undefined;
    if (!target) {
      return NextResponse.json({ success: false, error: "Evidence item not found" }, { status: 404 });
    }
    if (target.type !== "image") {
      return NextResponse.json({ success: false, error: "Only photos can be shown publicly." }, { status: 400 });
    }

    const updatedAt = new Date();
    const { publicApprovedAt: previousApprovedAt, publicApprovedBy: _previousApprovedBy, ...rest } = target;
    void _previousApprovedBy;
    const nextItem: StoredIssueEvidenceItem = body.approved
      ? { ...rest, publicApprovedAt: updatedAt.toISOString(), publicApprovedBy: user.id }
      : rest;
    const nextEvidence = evidence.map((item, itemIndex) => (itemIndex === index ? nextItem : item));

    await db
      .update(issues)
      .set({ evidence: nextEvidence, updatedAt })
      .where(eq(issues.id, issue.id));

    await logAudit({
      tableName: "issues",
      recordId: issue.id,
      action: "UPDATE",
      oldValues: { id: issue.id, ticketNumber: issue.ticketNumber, evidenceIndex: index, publicApprovedAt: previousApprovedAt ?? null },
      newValues: { id: issue.id, ticketNumber: issue.ticketNumber, evidenceIndex: index, publicApprovedAt: nextItem.publicApprovedAt ?? null },
      notes: `Evidence photo ${index + 1} ${body.approved ? "approved for public display" : "withdrawn from public display"}`,
      context: getAuditContextFromRequest(request, user),
    });

    return NextResponse.json({ success: true, data: { index, approved: body.approved } });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to update evidence" }, { status });
  }
}
