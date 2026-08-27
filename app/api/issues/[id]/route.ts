import { auth } from "@/lib/auth";
import { getIssueResponses } from "@/lib/admin-issues";
import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";
import {
  sanitizeCitizenIssueResponses,
  sanitizePublicIssueEvidence,
} from "@/lib/public-issue-dto";
import type { GeoTrackPoint, StoredIssueEvidenceItem } from "@/types/geo-evidence.types";
import { eq, or } from "drizzle-orm";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

type SessionUser = { id: string; role?: string | null };

export type IssueDetailRow = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  reporterUserId: string | null;
  reporterName: string | null;
  reporterContact: string | null;
  reporterEmail: string | null;
  isAnonymous: boolean;
  category: string;
  status: string;
  description: string;
  publicDescription: string | null;
  publicApprovedAt: Date | null;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  evidence: StoredIssueEvidenceItem[] | null;
  geoVideoTrack: GeoTrackPoint[] | null;
  geoVideoUrl: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  projectName: string | null;
};

type IssueResponse = Awaited<ReturnType<typeof getIssueResponses>>[number];

export type IssueDetailRouteDependencies = {
  getSessionUser: (request: Request) => Promise<SessionUser | null>;
  loadIssue: (id: string) => Promise<IssueDetailRow | null>;
  getResponses: (issueId: string) => Promise<IssueResponse[]>;
};

function toPublicStatus(status: string) {
  if (status === "reviewing") return "in-progress";
  if (status === "resolved") return "resolved";
  if (status === "closed") return "suspended";
  return "pending";
}

function formatIssueDetail(
  row: IssueDetailRow,
  responses: IssueResponse[],
  access: "owner" | "public",
) {
  const isOwner = access === "owner";
  const evidence = isOwner
    ? (Array.isArray(row.evidence) ? row.evidence : [])
    : sanitizePublicIssueEvidence(row.evidence);
  const safeResponses = sanitizeCitizenIssueResponses(responses);

  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    projectId: row.projectId,
    projectName: row.projectName ?? "Unlinked Infrastructure Report",
    project: row.projectName ? {
      id: row.projectId,
      name: row.projectName,
      code: row.projectId,
    } : null,
    category: row.category,
    issueType: row.category,
    status: toPublicStatus(row.status),
    fmrStatus: row.status === "submitted" ? "pending" : row.status,
    issueDescription: isOwner ? row.description : row.publicDescription,
    description: isOwner ? row.description : row.publicDescription,
    region: row.region ?? "",
    province: row.province ?? "",
    municipality: isOwner ? row.municipality ?? "" : "",
    city: isOwner ? row.municipality ?? "" : "",
    barangay: isOwner ? row.barangay ?? "" : "",
    evidence,
    resolvedAt: row.resolvedAt,
    date: row.createdAt,
    dateNoticed: row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    photoUrl: evidence.find((item) => item.type === "image")?.url ?? null,
    photoUrls: evidence.filter((item) => item.type === "image").map((item) => item.url),
    videoUrls: evidence.filter((item) => item.type === "video").map((item) => item.url),
    documentUrls: evidence.filter((item) => item.type === "document").map((item) => item.url),
    responses: safeResponses,
    comments: safeResponses,
    ...(isOwner ? {
      isAnonymous: row.isAnonymous,
      landmark: row.landmark ?? "",
      streetLandmark: row.landmark ?? "",
      latitude: row.latitude,
      longitude: row.longitude,
      geoVideoTrack: row.geoVideoTrack,
      geoVideoUrl: row.geoVideoUrl,
      reporter: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
      reporterName: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
      reporterPhone: row.isAnonymous ? null : row.reporterContact,
      ...(!row.isAnonymous ? { reporterEmail: row.reporterEmail } : {}),
    } : {}),
  };
}

function notFound() {
  return Response.json(
    { success: false, error: "Issue not found" },
    { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

export function createIssueDetailGetHandler(dependencies: IssueDetailRouteDependencies) {
  return async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { id } = await params;
    const [sessionUser, row] = await Promise.all([
      dependencies.getSessionUser(request),
      dependencies.loadIssue(id),
    ]);

    if (!row) return notFound();

    const isOwner = Boolean(sessionUser?.id && row.reporterUserId === sessionUser.id);
    const isPublic = Boolean(row.publicApprovedAt && row.publicDescription);
    if (!isOwner && !isPublic) return notFound();

    let responses: Awaited<ReturnType<IssueDetailRouteDependencies["getResponses"]>>;
    try {
      responses = await dependencies.getResponses(row.id);
    } catch (error) {
      console.error("[Issue Detail] Unable to load public response history:", error);
      return Response.json(
        { success: false, error: "Issue response history is temporarily unavailable" },
        { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }
    return Response.json(
      {
        success: true,
        data: formatIssueDetail(row, responses, isOwner ? "owner" : "public"),
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  };
}

async function loadIssue(id: string): Promise<IssueDetailRow | null> {
  const whereClause = UUID_PATTERN.test(id)
    ? or(eq(issues.id, id), eq(issues.ticketNumber, id))
    : eq(issues.ticketNumber, id);

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
      description: issues.description,
      publicDescription: issues.publicDescription,
      publicApprovedAt: issues.publicApprovedAt,
      region: issues.region,
      province: issues.province,
      municipality: issues.municipality,
      barangay: issues.barangay,
      landmark: issues.landmark,
      latitude: issues.latitude,
      longitude: issues.longitude,
      evidence: issues.evidence,
      geoVideoTrack: issues.geoVideoTrack,
      geoVideoUrl: issues.geoVideoUrl,
      resolvedAt: issues.resolvedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      projectName: projects.name,
    })
    .from(issues)
    .leftJoin(projects, eq(projects.abemisId, issues.projectId))
    .where(whereClause)
    .limit(1);

  return row ?? null;
}

export const GET = createIssueDetailGetHandler({
  getSessionUser: async (request) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      return session?.user ? { id: session.user.id, role: session.user.role } : null;
    } catch {
      return null;
    }
  },
  loadIssue,
  getResponses: (issueId) => getIssueResponses(issueId, false),
});
