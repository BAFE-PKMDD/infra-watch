import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditContextFromRequest, logAudit, logBlockedUploadAttempt } from "@/lib/audit";
import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";
import { generateUniqueFileName, uploadFile } from "@/lib/minio";
import { publishNotification } from "@/lib/realtime-notifications";
import { assertCleanText, assertSafeImageUpload } from "@/lib/services/content-moderation";
import { getClientUploadErrorMessage } from "@/lib/upload-errors";
import { validateUploadFile } from "@/lib/upload-validation";
import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

export const runtime = "nodejs";

type IssueRow = typeof issues.$inferSelect;

function normalizeStatus(status: string | null) {
  if (status === "reviewing" || status === "resolved" || status === "closed" || status === "submitted" || status === "pending") {
    return status;
  }

  if (status === "under-review") return "reviewing";
  if (status === "in-progress") return "reviewing";
  if (status === "suspended") return "closed";
  return undefined;
}

function toPublicStatus(status: string) {
  if (status === "pending") return "pending";
  if (status === "reviewing") return "in-progress";
  if (status === "resolved") return "resolved";
  if (status === "closed") return "suspended";
  return "pending";
}

function formatIssue(row: {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  reporterName: string | null;
  reporterContact: string | null;
  reporterEmail: string | null;
  isAnonymous: boolean;
  category: string;
  status: string;
  priority: string;
  description: string;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  landmark: string | null;
  evidence: Array<{ type: "image" | "video" | "document"; url: string; name?: string }> | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  projectName: string | null;
}) {
  const evidence = Array.isArray(row.evidence) ? row.evidence : [];
  const firstImage = evidence.find((item) => item.type === "image");

  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    projectId: row.projectId,
    projectName: row.projectName ?? "Unlinked Infrastructure Report",
    category: row.category,
    issueType: row.category,
    description: row.description,
    issueDescription: row.description,
    status: toPublicStatus(row.status),
    fmrStatus: row.status === "submitted" ? "pending" : row.status,
    rawStatus: row.status,
    priority: row.priority,
    date: row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reporter: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
    reporterName: row.isAnonymous ? "Anonymous" : row.reporterName || "Citizen",
    reporterPhone: row.isAnonymous ? null : row.reporterContact,
    reporterEmail: row.isAnonymous ? null : row.reporterEmail,
    isAnonymous: row.isAnonymous,
    region: row.region ?? "",
    province: row.province ?? "",
    city: row.municipality ?? "",
    municipality: row.municipality ?? "",
    barangay: row.barangay ?? "",
    streetLandmark: row.landmark ?? "",
    evidence,
    photoUrls: evidence.filter((item) => item.type === "image").map((item) => item.url),
    videoUrls: evidence.filter((item) => item.type === "video").map((item) => item.url),
    documentUrls: evidence.filter((item) => item.type === "document").map((item) => item.url),
    photoUrl: firstImage?.url ?? null,
    dateNoticed: row.createdAt,
    resolvedAt: row.resolvedAt,
    project: row.projectName ? {
      id: row.projectId,
      name: row.projectName,
      code: row.projectId,
    } : null,
    comments: [],
  };
}

async function uploadEvidence(
  file: FormDataEntryValue | null,
  request: NextRequest,
  actor?: { id?: string | null; name?: string | null; email?: string | null } | null,
) {
  if (!(file instanceof File) || file.size === 0) return [];

  const validated = await validateUploadFile(file).catch(async (error) => {
    const message = error instanceof Error ? error.message : "Invalid evidence upload";
    await logBlockedUploadAttempt({
      actor,
      request,
      file,
      folder: "issue-evidence",
      reason: message,
      category: getUploadAuditCategory(message),
    });
    throw error;
  });

  if (validated.kind !== "image") {
    const message = "Only JPG, PNG, WebP, or GIF evidence photos are allowed on this legacy endpoint.";
    await logBlockedUploadAttempt({
      actor,
      request,
      file,
      folder: "issue-evidence",
      reason: message,
      category: "invalid_mime",
    });
    throw new Error(message);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await assertSafeImageUpload(buffer).catch(async (error) => {
    const message = error instanceof Error ? error.message : "Image failed content moderation";
    await logBlockedUploadAttempt({
      actor,
      request,
      file,
      folder: "issue-evidence",
      reason: message,
      category: "nsfw_content",
    });
    throw error;
  });

  const fileName = generateUniqueFileName(`upload.${validated.safeExtension}`, "issue-evidence");
  const path = await uploadFile(fileName, buffer, validated.contentType, file.size);

  return [{
    type: "image" as const,
    url: path,
    name: file.name,
  }];
}

function getUploadAuditCategory(message: string) {
  if (message.includes("Invalid file extension")) return "invalid_extension";
  if (message.includes("File content does not match")) return "invalid_signature";
  if (message.includes("size exceeds")) return "size_limit";
  return "invalid_mime";
}

function toIssueAuditValues(issue: IssueRow): Record<string, unknown> {
  const evidence = Array.isArray(issue.evidence) ? issue.evidence : [];

  return {
    id: issue.id,
    ticketNumber: issue.ticketNumber,
    projectId: issue.projectId,
    reporterUserId: issue.reporterUserId,
    isAnonymous: issue.isAnonymous,
    category: issue.category,
    status: issue.status,
    priority: issue.priority,
    region: issue.region,
    province: issue.province,
    municipality: issue.municipality,
    barangay: issue.barangay,
    evidenceCount: evidence.length,
    createdAt: issue.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim();
  const status = normalizeStatus(params.get("status"));
  const hasOffset = params.has("offset");
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 20), 1), 50);
  const offset = hasOffset ? Math.max(Number(params.get("offset") ?? 0), 0) : (Math.max(Number(params.get("page") ?? 1), 1) - 1) * limit;
  const page = Math.floor(offset / limit) + 1;
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const conditions = [];

  if (status) {
    conditions.push(status === "pending" ? or(eq(issues.status, "pending"), eq(issues.status, "submitted")) : eq(issues.status, status));
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(issues.ticketNumber, pattern),
        ilike(issues.description, pattern),
        ilike(issues.category, pattern),
        ilike(issues.province, pattern),
        ilike(issues.municipality, pattern),
        ilike(issues.barangay, pattern),
        ilike(projects.name, pattern),
      ),
    );
  }
  if (startDate) conditions.push(gte(issues.createdAt, new Date(startDate)));
  if (endDate) {
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setHours(23, 59, 59, 999);
    conditions.push(lte(issues.createdAt, inclusiveEndDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
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
        evidence: issues.evidence,
        resolvedAt: issues.resolvedAt,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
        projectName: projects.name,
      })
      .from(issues)
      .leftJoin(projects, eq(projects.abemisId, issues.projectId))
      .where(whereClause)
      .orderBy(desc(issues.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(issues).leftJoin(projects, eq(projects.abemisId, issues.projectId)).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  return NextResponse.json({
    success: true,
    data: rows.map(formatIssue),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const category = String(body.issueType || body.category || "").trim();
      const description = String(body.issueDescription || body.description || "").trim();
      const isAnonymous = Boolean(body.isAnonymous);
      const reporterName = String(body.reporterName || "").trim();
      const reporterContact = String(body.reporterContact || body.contactNumber || "").trim();

      if (!category) {
        return NextResponse.json({ success: false, error: "Issue category is required." }, { status: 400 });
      }

      if (!description || description.length < 20) {
        return NextResponse.json({ success: false, error: "Description must be at least 20 characters." }, { status: 400 });
      }

      try {
        assertCleanText(description);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: error instanceof Error ? error.message : "Your report contains inappropriate language." },
          { status: 400 },
        );
      }

      if (!reporterContact) {
        return NextResponse.json({ success: false, error: "Contact number is required." }, { status: 400 });
      }

      if (Array.isArray(body.documentUrls) && body.documentUrls.length > 0) {
        return NextResponse.json({ success: false, error: "Document evidence is not allowed. Only images and videos can be attached." }, { status: 400 });
      }

      const evidence = [
        ...(Array.isArray(body.photoUrls) ? body.photoUrls.map((url: string) => ({ type: "image" as const, url })) : []),
        ...(Array.isArray(body.videoUrls) ? body.videoUrls.map((url: string) => ({ type: "video" as const, url })) : []),
      ];
      const ticketNumber = `INFRA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const [created] = await db
        .insert(issues)
        .values({
          ticketNumber,
          projectId: body.projectId || null,
          reporterUserId: session?.user?.id ?? null,
          reporterName: isAnonymous ? null : reporterName || session?.user?.name || "Citizen",
          reporterContact: isAnonymous ? null : reporterContact.replace(/[^0-9+]/g, ""),
          reporterEmail: isAnonymous ? null : body.reporterEmail || null,
          isAnonymous,
          category,
          status: "pending",
          priority: "normal",
          description,
          region: body.region || null,
          province: body.province || null,
          municipality: body.city || body.municipality || null,
          barangay: body.barangay || null,
          landmark: body.streetLandmark || body.landmark || null,
          evidence,
        })
        .returning();

      publishNotification({
        type: "issue_created",
        title: "New E-Report submitted",
        message: `A citizen submitted issue report ${ticketNumber}.`,
        metadata: {
          issueId: created.id,
          ticketNumber,
          projectId: body.projectId || null,
          category,
        },
      });

      await logAudit({
        tableName: "issues",
        recordId: created.id,
        action: "CREATE",
        newValues: toIssueAuditValues(created),
        notes: `Issue ${ticketNumber} submitted`,
        context: getAuditContextFromRequest(request, session?.user),
      });

      return NextResponse.json({
        success: true,
        data: created,
        message: `Issue reported successfully. Tracking ticket ${ticketNumber} has been created.`,
      }, { status: 201 });
    }

    const formData = await request.formData();
    const projectId = String(formData.get("projectId") || "").trim() || null;
    const category = String(formData.get("category") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const isAnonymous = String(formData.get("isAnonymous") || "false") === "true";
    const reporterName = String(formData.get("reporterName") || "").trim();
    const reporterContact = String(formData.get("reporterContact") || "").trim();
    const reporterEmail = String(formData.get("reporterEmail") || "").trim();

    if (!category) {
      return NextResponse.json({ success: false, error: "Issue category is required." }, { status: 400 });
    }

    if (!description || description.length < 10) {
      return NextResponse.json({ success: false, error: "Please provide a more detailed issue description." }, { status: 400 });
    }

    try {
      assertCleanText(description);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : "Your report contains inappropriate language." },
        { status: 400 },
      );
    }

    if (!isAnonymous && (!reporterName || !reporterContact)) {
      return NextResponse.json({ success: false, error: "Reporter name and contact number are required for verified reports." }, { status: 400 });
    }

    const evidence = await uploadEvidence(formData.get("evidence"), request, session?.user);
    const ticketNumber = `INFRA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const [created] = await db
      .insert(issues)
      .values({
        ticketNumber,
        projectId,
        reporterUserId: session?.user?.id ?? null,
        reporterName: isAnonymous ? null : reporterName,
        reporterContact: isAnonymous ? null : reporterContact,
        reporterEmail: isAnonymous ? null : reporterEmail || null,
        isAnonymous,
        category,
        status: "pending",
        priority: "normal",
        description,
        region: String(formData.get("region") || "").trim() || null,
        province: String(formData.get("province") || "").trim() || null,
        municipality: String(formData.get("municipality") || "").trim() || null,
        barangay: String(formData.get("barangay") || "").trim() || null,
        landmark: String(formData.get("landmark") || "").trim() || null,
        evidence,
      })
      .returning();

    publishNotification({
      type: "issue_created",
      title: "New E-Report submitted",
      message: `A citizen submitted issue report ${ticketNumber}.`,
      metadata: {
        issueId: created.id,
        ticketNumber,
        projectId,
        category,
      },
    });

    await logAudit({
      tableName: "issues",
      recordId: created.id,
      action: "CREATE",
      newValues: toIssueAuditValues(created),
      notes: `Issue ${ticketNumber} submitted`,
      context: getAuditContextFromRequest(request, session?.user),
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: `Issue report submitted. Tracking ticket ${ticketNumber} has been created.`,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create issue", error);
    const message = error instanceof Error ? error.message : "Failed to submit issue report.";
    const clientMessage = getClientUploadErrorMessage(message);

    return NextResponse.json(
      {
        success: false,
        error: clientMessage ?? message,
      },
      { status: clientMessage ? 400 : 500 },
    );
  }
}
