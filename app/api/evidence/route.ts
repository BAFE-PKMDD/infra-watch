import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { feedback, projects } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_GEO_TRACK_POINTS = 10_000;
const MAX_TRACK_TIME_SECONDS = 7 * 24 * 60 * 60;

function isCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const dateFilterSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use YYYY-MM-DD format.")
  .refine(isCalendarDate, "Invalid calendar date.");

const querySchema = z.object({
  startDate: dateFilterSchema.optional(),
  endDate: dateFilterSchema.optional(),
  category: z.string().trim().min(1).max(100).optional(),
  status: z.enum([
    "all",
    "pending",
    "submitted",
    "reviewing",
    "in-progress",
    "resolved",
    "approved",
    "closed",
    "suspended",
  ]).optional(),
  mediaType: z.enum(["all", "both", "image", "images", "photo", "photos", "video", "videos"]).default("both"),
}).superRefine((query, context) => {
  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must be on or after start date.",
    });
  }
});

const mediaPathSchema = z.string().trim().min(1).max(2048);
const optionalLatitudeSchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.number().finite().min(-90).max(90).optional(),
);
const optionalLongitudeSchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.number().finite().min(-180).max(180).optional(),
);
const optionalAccuracySchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.number().finite().nonnegative().optional(),
);

const publicTrackPointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  accuracy: optionalAccuracySchema,
  timeSeconds: z.preprocess(
    (value) => value === null ? undefined : value,
    z.number().finite().min(0).max(MAX_TRACK_TIME_SECONDS).optional(),
  ),
});

const publicTrackSchema = z.array(publicTrackPointSchema)
  .min(1)
  .max(MAX_GEO_TRACK_POINTS)
  .superRefine((track, context) => {
    let previousTime = -Infinity;

    track.forEach((point, index) => {
      if (point.timeSeconds === undefined) return;
      if (point.timeSeconds < previousTime) {
        context.addIssue({
          code: "custom",
          path: [index, "timeSeconds"],
          message: "Video track timestamps must be in nondecreasing order.",
        });
      }
      previousTime = point.timeSeconds;
    });
  });

const publicFeedbackMediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: mediaPathSchema,
  caption: z.string().trim().max(255).optional(),
  lat: optionalLatitudeSchema,
  lon: optionalLongitudeSchema,
  accuracy: optionalAccuracySchema,
  track: z.preprocess(
    (value) => value === null ? undefined : value,
    publicTrackSchema.optional(),
  ),
}).superRefine((item, context) => {
  const hasLat = item.lat !== undefined;
  const hasLon = item.lon !== undefined;

  if (hasLat !== hasLon) {
    context.addIssue({
      code: "custom",
      message: "Latitude and longitude must be provided together.",
    });
  }

  if (item.accuracy !== undefined && (!hasLat || !hasLon)) {
    context.addIssue({
      code: "custom",
      message: "Accuracy requires a coordinate pair.",
    });
  }

  if (item.track && item.type !== "video") {
    context.addIssue({
      code: "custom",
      message: "Only videos can include a geographic track.",
    });
  }
});

type MediaFilter = "both" | "image" | "video";

function normalizeMediaFilter(value: z.infer<typeof querySchema>["mediaType"]): MediaFilter {
  if (value === "image" || value === "images" || value === "photo" || value === "photos") return "image";
  if (value === "video" || value === "videos") return "video";
  return "both";
}

function normalizeStatusFilter(status: z.infer<typeof querySchema>["status"]) {
  if (!status || status === "all") return null;
  if (status === "in-progress") return "reviewing";
  if (status === "suspended") return "closed";
  return status;
}

function sanitizeFeedbackMedia(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const parsed = publicFeedbackMediaSchema.safeParse(item);
    if (!parsed.success) return [];

    const firstTrackPoint = parsed.data.track?.[0];
    return [{
      ...parsed.data,
      ...(parsed.data.lat === undefined && firstTrackPoint
        ? { lat: firstTrackPoint.lat, lon: firstTrackPoint.lon }
        : {}),
    }];
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsedQuery = querySchema.safeParse({
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    category: params.get("category") ?? undefined,
    status: params.get("status") ?? undefined,
    mediaType: params.get("mediaType") ?? params.get("media") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { success: false, error: parsedQuery.error.issues[0]?.message ?? "Invalid evidence filters." },
      { status: 400 },
    );
  }

  const query = parsedQuery.data;
  const mediaFilter = normalizeMediaFilter(query.mediaType);
  const status = normalizeStatusFilter(query.status);
  const feedbackCandidateGeoCondition = sql<boolean>`exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(${feedback.media}) = 'array' then ${feedback.media}
        else '[]'::jsonb
      end
    ) as feedback_media
    where (
      feedback_media ? 'lat' and feedback_media ? 'lon'
    ) or jsonb_array_length(
      case
        when jsonb_typeof(feedback_media -> 'track') = 'array' then feedback_media -> 'track'
        else '[]'::jsonb
      end
    ) > 0
  )`;
  const feedbackConditions: SQL[] = [
    eq(feedback.status, "approved"),
    feedbackCandidateGeoCondition,
  ];

  if (status && status !== "approved") feedbackConditions.push(sql<boolean>`false`);
  if (query.category) feedbackConditions.push(eq(feedback.category, query.category));
  if (query.startDate) feedbackConditions.push(gte(feedback.createdAt, new Date(`${query.startDate}T00:00:00.000Z`)));
  if (query.endDate) feedbackConditions.push(lte(feedback.createdAt, new Date(`${query.endDate}T23:59:59.999Z`)));

  try {
    const feedbackRows = await db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        projectCode: projects.projectCode,
        projectName: projects.name,
        category: feedback.category,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
        media: feedback.media,
        region: projects.region,
        province: projects.province,
        municipality: projects.municipality,
        barangay: projects.barangay,
      })
      .from(feedback)
      .innerJoin(projects, eq(projects.abemisId, feedback.projectId))
      .where(and(...feedbackConditions))
      .orderBy(desc(feedback.createdAt));

    const feedbackData = feedbackRows.flatMap((row) => {
      const allMedia = sanitizeFeedbackMedia(row.media);
      const filteredMedia = allMedia.filter((item) => (
        mediaFilter === "both" || item.type === mediaFilter
      ));
      const evidence = filteredMedia.flatMap((item) => {
        if (item.lat === undefined || item.lon === undefined) return [];
        return [{
          type: item.type,
          url: item.url,
          ...(item.caption ? { name: item.caption } : {}),
          lat: item.lat,
          lon: item.lon,
          ...(item.accuracy !== undefined ? { accuracy: item.accuracy } : {}),
          ...(item.track ? { track: item.track } : {}),
        }];
      });
      const trackedVideo = mediaFilter === "image"
        ? undefined
        : filteredMedia.find((item) => item.type === "video" && item.track?.length);
      const track = trackedVideo?.track ?? null;

      if (evidence.length === 0 && !track) return [];

      const projectLabel = row.projectCode || row.projectName || row.projectId;
      return [{
        issueId: `feedback:${row.id}`,
        sourceType: "feedback" as const,
        detailUrl: `/projects/${encodeURIComponent(row.projectId)}?tab=feedback&feedbackId=${encodeURIComponent(row.id)}`,
        ticketNumber: `Feedback - ${projectLabel}`,
        category: row.category ?? "general",
        status: "approved",
        description: (row.comment ?? "Project feedback").slice(0, 240),
        createdAt: row.createdAt,
        location: {
          region: row.region ?? "",
          province: row.province ?? "",
          municipality: row.municipality ?? "",
          barangay: row.barangay ?? "",
        },
        evidence,
        geoVideoTrack: track,
        geoVideoUrl: track && trackedVideo ? trackedVideo.url : null,
      }];
    });

    const data = feedbackData
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return NextResponse.json(
      { success: true, data, count: data.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load geotagged evidence", error);
    return NextResponse.json(
      { success: false, error: "Failed to load geotagged evidence." },
      { status: 500 },
    );
  }
}
