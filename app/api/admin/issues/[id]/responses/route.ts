import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { ensureIssueResponsesTable, getIssueByIdOrTicket, requireIssuePermission, toDbIssueStatus } from "@/lib/admin-issues";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { issueResponses, issues } from "@/lib/db/schema";
import { checkIssueScope } from "@/lib/scope";
import { assertCleanText } from "@/lib/services/content-moderation";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireIssuePermission(request, "respond");
    await ensureIssueResponsesTable();
    const { id } = await params;
    const issue = await getIssueByIdOrTicket(id);

    if (!issue) {
      return NextResponse.json({ success: false, error: "Issue not found" }, { status: 404 });
    }

    const scopeCheck = await checkIssueScope(user, issue);
    if (!scopeCheck.allowed) {
      return NextResponse.json({ success: false, error: `Forbidden: ${scopeCheck.reason}` }, { status: 403 });
    }

    const body = await request.json();
    const message = String(body.message || "").trim();
    const internalNotes = String(body.internalNotes || "").trim();
    const isInternalOnly = Boolean(body.isInternalOnly);
    const publishToPublic = Boolean(body.publishToPublic);
    const publicDescription = String(body.publicDescription || "").trim();
    const nextStatus = toDbIssueStatus(body.newStatus);

    if (publishToPublic) {
      if (isInternalOnly) {
        return NextResponse.json({ success: false, error: "A public summary cannot accompany an internal-only response." }, { status: 400 });
      }
      if (publicDescription.length < 20 || publicDescription.length > 2_000) {
        return NextResponse.json({ success: false, error: "Public summary must be between 20 and 2,000 characters." }, { status: 400 });
      }
      assertCleanText(publicDescription);
    }

    if (!message && !isInternalOnly && !publishToPublic) {
      return NextResponse.json({ success: false, error: "Response message is required." }, { status: 400 });
    }

    const statusChange = nextStatus && nextStatus !== issue.status ? `${issue.status} -> ${nextStatus}` : null;

    const [created] = await db
      .insert(issueResponses)
      .values({
        issueId: issue.id,
        responderId: user.id,
        responderName: user.name || user.email || "Staff",
        responderRole: typeof user.role === "string" ? user.role : "staff",
        message: message || internalNotes || "Internal note",
        statusChange,
        newStatus: nextStatus ?? null,
        internalNotes: internalNotes || null,
        isInternalOnly,
        attachmentUrls: Array.isArray(body.attachmentUrls) ? body.attachmentUrls : [],
      })
      .returning();

    if ((nextStatus && nextStatus !== issue.status) || publishToPublic) {
      const updatedAt = new Date();
      const resolvedAt = nextStatus === "resolved" ? updatedAt : issue.resolvedAt;

      await db
        .update(issues)
        .set({
          status: nextStatus ?? issue.status,
          resolvedAt,
          ...(publishToPublic ? {
            publicDescription,
            publicApprovedAt: updatedAt,
            publicApprovedBy: user.id,
          } : {}),
          updatedAt,
        })
        .where(eq(issues.id, issue.id));

      await logAudit({
        tableName: "issues",
        recordId: issue.id,
        action: "UPDATE",
        oldValues: {
          id: issue.id,
          ticketNumber: issue.ticketNumber,
          status: issue.status,
          resolvedAt: issue.resolvedAt,
          publicDescription: issue.publicDescription,
          publicApprovedAt: issue.publicApprovedAt,
        },
        newValues: {
          id: issue.id,
          ticketNumber: issue.ticketNumber,
          status: nextStatus ?? issue.status,
          resolvedAt,
          ...(publishToPublic ? {
            publicDescription,
            publicApprovedAt: updatedAt,
            publicApprovedBy: user.id,
          } : {}),
          updatedAt,
        },
        notes: publishToPublic
          ? `Issue public summary approved${nextStatus && nextStatus !== issue.status ? `; status changed: ${issue.status} -> ${nextStatus}` : ""}`
          : `Issue status changed: ${issue.status} -> ${nextStatus}`,
        context: getAuditContextFromRequest(request, user),
      });
    }

    await logAudit({
      tableName: "issue_responses",
      recordId: created.id,
      action: "CREATE",
      newValues: { ...created },
      notes: `Response added to issue ${issue.ticketNumber}`,
      context: getAuditContextFromRequest(request, user),
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to add response" }, { status });
  }
}
