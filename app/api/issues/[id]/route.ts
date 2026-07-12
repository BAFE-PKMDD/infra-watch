import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { getIssueResponses } from "@/lib/admin-issues";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toPublicStatus(status: string) {
  if (status === "pending") return "pending";
  if (status === "reviewing") return "in-progress";
  if (status === "resolved") return "resolved";
  if (status === "closed") return "suspended";
  return "pending";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const whereClause = UUID_PATTERN.test(id)
    ? or(eq(issues.id, id), eq(issues.ticketNumber, id))
    : eq(issues.ticketNumber, id);

  const [row] = await db
    .select({
      id: issues.id,
      ticketNumber: issues.ticketNumber,
      projectId: issues.projectId,
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
      latitude: issues.latitude,
      longitude: issues.longitude,
      evidence: issues.evidence,
      resolvedAt: issues.resolvedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      projectName: projects.name,
    })
    .from(issues)
    .leftJoin(projects, eq(projects.abemisId, issues.projectId))
    .where(whereClause)
    .limit(1);

  if (!row) {
    return NextResponse.json({ success: false, error: "Issue not found" }, { status: 404 });
  }

  const responses = await getIssueResponses(row.id, false).catch(() => []);

  return NextResponse.json({
    success: true,
    data: {
      ...row,
      projectName: row.projectName ?? "Unlinked Infrastructure Report",
      status: toPublicStatus(row.status),
      rawStatus: row.status,
      fmrStatus: row.status === "submitted" ? "pending" : row.status,
      issueType: row.category,
      issueDescription: row.description,
      date: row.createdAt,
      createdAt: row.createdAt,
      reporter: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
      reporterName: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
      reporterPhone: row.isAnonymous ? null : row.reporterContact,
      reporterEmail: row.isAnonymous ? null : row.reporterEmail,
      city: row.municipality ?? "",
      streetLandmark: row.landmark ?? "",
      photoUrl: Array.isArray(row.evidence) ? row.evidence.find((item) => item.type === "image")?.url ?? null : null,
      photoUrls: Array.isArray(row.evidence) ? row.evidence.filter((item) => item.type === "image").map((item) => item.url) : [],
      videoUrls: Array.isArray(row.evidence) ? row.evidence.filter((item) => item.type === "video").map((item) => item.url) : [],
      documentUrls: Array.isArray(row.evidence) ? row.evidence.filter((item) => item.type === "document").map((item) => item.url) : [],
      project: row.projectName ? {
        id: row.projectId,
        name: row.projectName,
        code: row.projectId,
      } : null,
      responses,
      comments: responses,
    },
  });
}
