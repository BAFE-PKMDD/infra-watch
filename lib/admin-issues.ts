import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { issues, projects, issueResponses } from "@/lib/db/schema";
import { hasPermission } from "@/lib/permissions";
import { eq, sql } from "drizzle-orm";

export type IssueAdminStatus = "pending" | "reviewing" | "resolved" | "closed";

export function normalizeIssueStatus(status: string | null | undefined): IssueAdminStatus {
  if (status === "reviewing" || status === "resolved" || status === "closed" || status === "pending") return status;
  if (status === "submitted") return "pending";
  if (status === "in-progress") return "reviewing";
  if (status === "suspended") return "closed";
  return "pending";
}

export function toDbIssueStatus(status: string | null | undefined): string | undefined {
  if (!status || status === "all") return undefined;
  if (status === "pending") return "pending";
  if (status === "reviewing" || status === "resolved" || status === "closed") return status;
  if (status === "in-progress") return "reviewing";
  if (status === "suspended") return "closed";
  return undefined;
}

export async function requireIssuePermission(request: Request, action: "list" | "read" | "respond" | "delete" | "update" | "resolve") {
  const session = await auth.api.getSession({ headers: request.headers });
  const role = session?.user?.role;

  if (!session?.user || !hasPermission(role, "issues", action)) {
    const error = new Error(!session?.user ? "Unauthorized" : "Forbidden");
    (error as Error & { status?: number }).status = !session?.user ? 401 : 403;
    throw error;
  }

  return session.user;
}

export async function ensureIssueResponsesTable() {
  await db.execute(sql`
    create table if not exists issue_responses (
      id uuid primary key default gen_random_uuid(),
      issue_id uuid not null references issues(id) on delete cascade,
      responder_id text not null,
      responder_name text not null,
      responder_role text,
      message text not null,
      status_change text,
      new_status text,
      internal_notes text,
      is_internal_only boolean not null default false,
      attachment_urls jsonb default '[]'::jsonb,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);
  await db.execute(sql`create index if not exists issue_responses_issue_id_idx on issue_responses(issue_id)`);
  await db.execute(sql`create index if not exists issue_responses_responder_id_idx on issue_responses(responder_id)`);
}

export async function getIssueByIdOrTicket(id: string) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const [row] = await db
    .select({
      id: issues.id,
      ticketNumber: issues.ticketNumber,
      projectId: issues.projectId,
      reporterUserId: issues.reporterUserId,
      reporterName: issues.reporterName,
      reporterContact: issues.reporterContact,
      reporterEmail: issues.reporterEmail,
      isAnonymous: issues.isAnonymous,
      category: issues.category,
      status: issues.status,
      priority: issues.priority,
      description: issues.description,
      region: issues.region,
      province: issues.province,
      municipality: issues.municipality,
      barangay: issues.barangay,
      landmark: issues.landmark,
      evidence: issues.evidence,
      resolvedAt: issues.resolvedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      projectName: projects.name,
    })
    .from(issues)
    .leftJoin(projects, eq(projects.abemisId, issues.projectId))
    .where(uuidPattern.test(id) ? eq(issues.id, id) : eq(issues.ticketNumber, id))
    .limit(1);

  return row ?? null;
}

export function formatAdminIssue(row: NonNullable<Awaited<ReturnType<typeof getIssueByIdOrTicket>>>) {
  const evidence = Array.isArray(row.evidence) ? row.evidence : [];

  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    projectId: row.projectId,
    projectName: row.projectName,
    issueType: row.category,
    issueDescription: row.description,
    status: normalizeIssueStatus(row.status),
    rawStatus: row.status,
    priority: row.priority,
    region: row.region ?? "",
    province: row.province ?? "",
    city: row.municipality ?? "",
    barangay: row.barangay ?? "",
    streetLandmark: row.landmark ?? "",
    reporterUserId: row.reporterUserId,
    reporterName: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
    reporterContact: row.isAnonymous ? null : row.reporterContact,
    reporterEmail: row.isAnonymous ? null : row.reporterEmail,
    isAnonymous: row.isAnonymous,
    photoUrls: evidence.filter((item) => item.type === "image").map((item) => item.url),
    videoUrls: evidence.filter((item) => item.type === "video").map((item) => item.url),
    documentUrls: evidence.filter((item) => item.type === "document").map((item) => item.url),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dateNoticed: row.createdAt,
    resolvedAt: row.resolvedAt,
    project: row.projectName ? {
      id: row.projectId,
      name: row.projectName,
      code: row.projectId,
    } : null,
  };
}

export async function getIssueResponses(issueId: string, includeInternal = true) {
  await ensureIssueResponsesTable();
  const rows = await db
    .select()
    .from(issueResponses)
    .where(eq(issueResponses.issueId, issueId))
    .orderBy(issueResponses.createdAt);

  return rows
    .filter((row) => includeInternal || !row.isInternalOnly)
    .map((row) => ({
      id: row.id,
      message: row.message,
      statusChange: row.statusChange,
      newStatus: row.newStatus,
      attachmentUrls: row.attachmentUrls ?? [],
      internalNotes: row.internalNotes,
      isInternalOnly: row.isInternalOnly,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      responder: {
        id: row.responderId,
        name: row.responderName,
        role: row.responderRole ?? "staff",
      },
      responderName: row.responderName,
    }));
}
