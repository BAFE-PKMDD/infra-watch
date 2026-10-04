import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditContextFromRequest, logAudit, logBlockedUploadAttempt } from "@/lib/audit";
import { db } from "@/lib/db";
import { issues, issueResponses, projects } from "@/lib/db/schema";
import { getAutoReplySettings } from "@/actions/query/settings.query";
import { generateUniqueFileName, uploadFile } from "@/lib/minio";
import { publishAndPersistNotification } from "@/lib/notification-persistence";
import { formatPublicIssue } from "@/lib/public-issue-dto";
import { getIssueNotificationRecipientIds } from "@/lib/staff-notification-recipients";
import { assertCleanText, assertSafeImageUpload } from "@/lib/services/content-moderation";
import { getClientUploadErrorMessage } from "@/lib/upload-errors";
import { validateUploadFile } from "@/lib/upload-validation";
import { and, count, desc, eq, gte, ilike, isNotNull, lte, or, sql } from "drizzle-orm";
import { z } from 'zod';
import type { GeoTrackPoint, StoredIssueEvidenceItem } from '@/types/geo-evidence.types';

export const runtime = "nodejs";

const MAX_ISSUE_EVIDENCE = 5;
const MAX_GEO_TRACK_POINTS = 10_000;
const MAX_TRACK_TIME_SECONDS = 7 * 24 * 60 * 60;

async function notifyStaffOfNewIssue(issue: {
  id: string;
  ticketNumber: string;
  projectId?: string | null;
  region?: string | null;
  category: string;
}) {
  try {
    const recipientUserIds = await getIssueNotificationRecipientIds(issue);
    await publishAndPersistNotification(
      {
        type: "issue_created",
        title: "New E-Report submitted",
        message: `A citizen submitted issue report ${issue.ticketNumber}.`,
        metadata: {
          issueId: issue.id,
          ticketNumber: issue.ticketNumber,
          projectId: issue.projectId ?? null,
          category: issue.category,
        },
      },
      recipientUserIds,
    );
  } catch (error) {
    console.error("Failed to persist scoped issue notification", {
      issueId: issue.id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

const SYSTEM_AUTO_ACTOR_ID = "system-auto-acceptance";

// Content (text + evidence) is already verified clean by assertCleanText/assertSafeImageUpload
// before this is called, so "auto-accept" only needs to decide whether to skip the manual
// staff acceptance/publish steps — no additional moderation check is needed here. The
// citizen's own description already meets the same length/clean-text bar the manual
// "publish to public" flow enforces, so it's safe to reuse verbatim as publicDescription.
async function resolveInitialIssueStatus(description: string): Promise<{
  status: "pending" | "reviewing";
  autoAccepted: boolean;
  message: string | null;
  publicDescription: string | null;
  publicApprovedAt: Date | null;
  publicApprovedBy: string | null;
}> {
  const settings = await getAutoReplySettings();
  if (settings.data.issues.enabled) {
    // Mirrors the manual "publish to public" flow's own 20-char floor (responses/route.ts) —
    // the formData submission path allows descriptions as short as 10 chars, which shouldn't
    // bypass that bar just because auto-accept is on.
    const canAutoPublish = description.trim().length >= 20;
    return {
      status: "reviewing",
      autoAccepted: true,
      message: settings.data.issues.message,
      publicDescription: canAutoPublish ? description : null,
      publicApprovedAt: canAutoPublish ? new Date() : null,
      publicApprovedBy: canAutoPublish ? SYSTEM_AUTO_ACTOR_ID : null,
    };
  }
  return { status: "pending", autoAccepted: false, message: null, publicDescription: null, publicApprovedAt: null, publicApprovedBy: null };
}

async function recordAutoAcceptance(issueId: string, message: string) {
  await db.insert(issueResponses).values({
    issueId,
    responderId: SYSTEM_AUTO_ACTOR_ID,
    responderName: "InfraWatch Automated System",
    responderRole: "system",
    message,
    statusChange: null,
    newStatus: null,
    isInternalOnly: false,
  });
}

const mediaPathSchema = z.string().trim().min(1, 'Evidence URL is required.').max(2048, 'Evidence URL is too long.');
const optionalLatitudeSchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.number().finite().min(-90, 'Latitude must be at least -90.').max(90, 'Latitude must be at most 90.').optional(),
);
const optionalLongitudeSchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.number().finite().min(-180, 'Longitude must be at least -180.').max(180, 'Longitude must be at most 180.').optional(),
);
const optionalAccuracySchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.number().finite().nonnegative('Accuracy cannot be negative.').optional(),
);

const geoTrackPointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  accuracy: optionalAccuracySchema,
  timeSeconds: z.preprocess(
    (value) => value === null ? undefined : value,
    z.number().finite().min(0).max(MAX_TRACK_TIME_SECONDS).optional(),
  ),
}).strict();

const geoTrackSchema = z.array(geoTrackPointSchema)
  .max(MAX_GEO_TRACK_POINTS, `A video track cannot contain more than ${MAX_GEO_TRACK_POINTS} points.`)
  .superRefine((track, context) => {
    let previousTime = -Infinity;

    track.forEach((point, index) => {
      if (point.timeSeconds === undefined) return;
      if (point.timeSeconds < previousTime) {
        context.addIssue({
          code: 'custom',
          path: [index, 'timeSeconds'],
          message: 'Video track timestamps must be in nondecreasing order.',
        });
      }
      previousTime = point.timeSeconds;
    });
  });

const canonicalEvidenceItemSchema = z.object({
  type: z.enum(['image', 'video']),
  url: mediaPathSchema,
  name: z.string().trim().min(1).max(255).optional(),
  lat: optionalLatitudeSchema,
  lon: optionalLongitudeSchema,
  accuracy: optionalAccuracySchema,
  track: z.preprocess(
    (value) => value === null ? undefined : value,
    geoTrackSchema.optional(),
  ),
}).strict().superRefine((item, context) => {
  const hasLat = item.lat !== undefined;
  const hasLon = item.lon !== undefined;

  if (hasLat !== hasLon) {
    context.addIssue({
      code: 'custom',
      path: hasLat ? ['lon'] : ['lat'],
      message: 'Latitude and longitude must be provided together.',
    });
  }

  if (item.accuracy !== undefined && (!hasLat || !hasLon)) {
    context.addIssue({
      code: 'custom',
      path: ['accuracy'],
      message: 'Accuracy requires both latitude and longitude.',
    });
  }

  if (item.type !== 'video' && item.track && item.track.length > 0) {
    context.addIssue({
      code: 'custom',
      path: ['track'],
      message: 'Only video evidence can include a geographic track.',
    });
  }
});

const issueEvidencePayloadSchema = z.object({
  evidence: z.array(canonicalEvidenceItemSchema)
    .max(MAX_ISSUE_EVIDENCE, `You can attach up to ${MAX_ISSUE_EVIDENCE} evidence files.`)
    .optional(),
  photoUrls: z.array(mediaPathSchema).max(MAX_ISSUE_EVIDENCE).optional(),
  videoUrls: z.array(mediaPathSchema).max(MAX_ISSUE_EVIDENCE).optional(),
  documentUrls: z.array(mediaPathSchema).max(MAX_ISSUE_EVIDENCE).optional(),
  geoVideoTrack: z.preprocess(
    (value) => value === null ? undefined : value,
    geoTrackSchema.optional(),
  ),
  geoVideoUrl: z.preprocess(
    (value) => value === null || value === '' ? undefined : value,
    mediaPathSchema.optional(),
  ),
}).passthrough().superRefine((payload, context) => {
  if (payload.evidence === undefined) {
    const legacyEvidenceCount = (payload.photoUrls?.length ?? 0) + (payload.videoUrls?.length ?? 0);
    if (legacyEvidenceCount > MAX_ISSUE_EVIDENCE) {
      context.addIssue({
        code: 'custom',
        path: ['photoUrls'],
        message: `You can attach up to ${MAX_ISSUE_EVIDENCE} evidence files.`,
      });
    }
  }

  if ((payload.documentUrls?.length ?? 0) > 0) {
    context.addIssue({
      code: 'custom',
      path: ['documentUrls'],
      message: 'Document evidence is not allowed. Only images and videos can be attached.',
    });
  }

  const hasTopLevelTrack = (payload.geoVideoTrack?.length ?? 0) > 0;
  const hasTopLevelUrl = Boolean(payload.geoVideoUrl);
  if (hasTopLevelTrack !== hasTopLevelUrl) {
    context.addIssue({
      code: 'custom',
      path: hasTopLevelTrack ? ['geoVideoUrl'] : ['geoVideoTrack'],
      message: 'A geographic video track and its video URL must be provided together.',
    });
  }

  if (hasTopLevelTrack && payload.geoVideoUrl) {
    const videoUrls = payload.evidence === undefined
      ? payload.videoUrls ?? []
      : payload.evidence.filter((item) => item.type === 'video').map((item) => item.url);

    if (!videoUrls.includes(payload.geoVideoUrl)) {
      context.addIssue({
        code: 'custom',
        path: ['geoVideoUrl'],
        message: 'The geographic video URL must match an attached video.',
      });
    }
  }
});

type CanonicalEvidenceItem = z.infer<typeof canonicalEvidenceItemSchema>;

function parseIssueEvidencePayload(body: unknown):
  | { success: true; evidence: StoredIssueEvidenceItem[]; geoVideoTrack: GeoTrackPoint[] | null; geoVideoUrl: string | null }
  | { success: false; error: string } {
  const parsed = issueEvidencePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid evidence payload.',
    };
  }

  const inputEvidence: CanonicalEvidenceItem[] = parsed.data.evidence ?? [
    ...(parsed.data.photoUrls ?? []).map((url) => ({ type: 'image' as const, url })),
    ...(parsed.data.videoUrls ?? []).map((url) => ({ type: 'video' as const, url })),
  ];
  const firstTrackedVideo = inputEvidence.find(
    (item) => item.type === 'video' && item.track && item.track.length > 0,
  );
  const evidence = inputEvidence.map(({ track, ...item }): StoredIssueEvidenceItem => {
    const firstTrackPoint = item.type === 'video' ? track?.[0] : undefined;
    const usesTrackLocation = item.lat === undefined && firstTrackPoint !== undefined;

    return {
      ...item,
      lat: item.lat ?? firstTrackPoint?.lat,
      lon: item.lon ?? firstTrackPoint?.lon,
      accuracy: item.accuracy ?? (usesTrackLocation ? firstTrackPoint?.accuracy : undefined),
    };
  });
  const geoVideoTrack = firstTrackedVideo?.track?.length
    ? firstTrackedVideo.track
    : parsed.data.geoVideoTrack?.length
      ? parsed.data.geoVideoTrack
      : null;
  const geoVideoUrl = firstTrackedVideo?.track?.length
    ? firstTrackedVideo.url
    : geoVideoTrack
      ? parsed.data.geoVideoUrl ?? null
      : null;

  return { success: true, evidence, geoVideoTrack, geoVideoUrl };
}

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

function buildIssueAuditNote(ticketNumber: string, status: Awaited<ReturnType<typeof resolveInitialIssueStatus>>) {
  if (!status.autoAccepted) return `Issue ${ticketNumber} submitted`;
  return status.publicDescription
    ? `Issue ${ticketNumber} submitted, auto-accepted, and auto-published to the public directory (passed automated content checks)`
    : `Issue ${ticketNumber} submitted and auto-accepted (passed automated content checks)`;
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
    hasGeoVideo: Boolean(issue.geoVideoUrl && issue.geoVideoTrack?.length),
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

  // Workflow state is not publication approval. Only an explicitly approved,
  // moderator-written summary may appear in the anonymous public directory.
  conditions.push(isNotNull(issues.publicApprovedAt));
  conditions.push(isNotNull(issues.publicDescription));

  if (status) {
    conditions.push(eq(issues.status, status));
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(issues.ticketNumber, pattern),
        ilike(issues.publicDescription, pattern),
        ilike(issues.category, pattern),
        ilike(issues.province, pattern),
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
        category: issues.category,
        issueType: issues.issueType,
        farmOperation: sql<string | null>`coalesce(${issues.reportedFarmOperation}, ${projects.farmOperation})`,
        status: issues.status,
        publicDescription: issues.publicDescription,
        region: issues.region,
        province: issues.province,
        municipality: sql<string | null>`null`,
        barangay: sql<string | null>`null`,
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

  return NextResponse.json(
    {
      success: true,
      data: rows.map(formatPublicIssue),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const rawCategory = String(body.category || "").trim();
      const rawIssueType = String(body.issueType || "").trim();
      const category = rawCategory || rawIssueType;
      const issueType = rawIssueType || rawCategory;
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

      const evidencePayload = parseIssueEvidencePayload(body);
      if (!evidencePayload.success) {
        return NextResponse.json({ success: false, error: evidencePayload.error }, { status: 400 });
      }

      const { evidence, geoVideoTrack, geoVideoUrl } = evidencePayload;
      const ticketNumber = `INFRA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const initialStatus = await resolveInitialIssueStatus(description);

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
          issueType,
          status: initialStatus.status,
          priority: "normal",
          description,
          publicDescription: initialStatus.publicDescription,
          publicApprovedAt: initialStatus.publicApprovedAt,
          publicApprovedBy: initialStatus.publicApprovedBy,
          reportedFarmOperation: body.farmOperation || null,
          reportedProjectType: body.projectType || null,
          region: body.region || null,
          province: body.province || null,
          municipality: body.city || body.municipality || null,
          barangay: body.barangay || null,
          landmark: body.streetLandmark || body.landmark || null,
          evidence,
          geoVideoTrack,
          geoVideoUrl,
        })
        .returning();

      if (initialStatus.autoAccepted && initialStatus.message) {
        await recordAutoAcceptance(created.id, initialStatus.message);
      }

      await notifyStaffOfNewIssue({
        id: created.id,
        ticketNumber,
        projectId: created.projectId,
        region: created.region,
        category,
      });

      await logAudit({
        tableName: "issues",
        recordId: created.id,
        action: "CREATE",
        newValues: toIssueAuditValues(created),
        notes: buildIssueAuditNote(ticketNumber, initialStatus),
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
    const initialStatus = await resolveInitialIssueStatus(description);

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
        status: initialStatus.status,
        priority: "normal",
        description,
        publicDescription: initialStatus.publicDescription,
        publicApprovedAt: initialStatus.publicApprovedAt,
        publicApprovedBy: initialStatus.publicApprovedBy,
        region: String(formData.get("region") || "").trim() || null,
        province: String(formData.get("province") || "").trim() || null,
        municipality: String(formData.get("municipality") || "").trim() || null,
        barangay: String(formData.get("barangay") || "").trim() || null,
        landmark: String(formData.get("landmark") || "").trim() || null,
        evidence,
      })
      .returning();

    if (initialStatus.autoAccepted && initialStatus.message) {
      await recordAutoAcceptance(created.id, initialStatus.message);
    }

    await notifyStaffOfNewIssue({
      id: created.id,
      ticketNumber,
      projectId: created.projectId,
      region: created.region,
      category,
    });

    await logAudit({
      tableName: "issues",
      recordId: created.id,
      action: "CREATE",
      newValues: toIssueAuditValues(created),
      notes: buildIssueAuditNote(ticketNumber, initialStatus),
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
