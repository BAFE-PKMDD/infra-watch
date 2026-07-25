import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/minio";
import { feedback } from "@/lib/db/schema";
import { assertCleanText } from "@/lib/services/content-moderation";
import { eq } from "drizzle-orm";
import type { FeedbackMedia } from "@/types/feedback.types";
import type { GeoTrackPoint } from "@/types/geo-evidence.types";

export const runtime = "nodejs";

const FEEDBACK_CATEGORIES = new Set(["quality", "progress", "concerns", "general"]);
const MAX_MEDIA_ITEMS = 5;
const MAX_GEO_TRACK_POINTS = 10_000;
const MAX_TRACK_TIME_SECONDS = 7 * 24 * 60 * 60;

type MediaNormalizationResult =
  | { success: true; data: FeedbackMedia[] }
  | { success: false; error: string };

function normalizeMedia(value: unknown): MediaNormalizationResult {
  if (!Array.isArray(value)) {
    return { success: true, data: [] };
  }

  if (value.length > MAX_MEDIA_ITEMS) {
    return { success: false, error: `Maximum ${MAX_MEDIA_ITEMS} media files allowed` };
  }

  const media: FeedbackMedia[] = [];

  for (const [mediaIndex, item] of value.entries()) {
    if (!item || typeof item !== "object") {
      return { success: false, error: `Media item ${mediaIndex + 1} is invalid.` };
    }

    const raw = item as Record<string, unknown>;
    if (raw.type !== "image" && raw.type !== "video") {
      return { success: false, error: `Media item ${mediaIndex + 1} has an invalid type.` };
    }

    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    if (!url || url.length > 2048) {
      return { success: false, error: `Media item ${mediaIndex + 1} has an invalid URL.` };
    }

    const caption = typeof raw.caption === "string" ? raw.caption.trim() : undefined;
    if (caption && caption.length > 255) {
      return { success: false, error: `Media item ${mediaIndex + 1} caption is too long.` };
    }

    let track: GeoTrackPoint[] | undefined;
    if (raw.track !== undefined && raw.track !== null) {
      if (raw.type !== "video") {
        return { success: false, error: "Only videos can include a geographic track." };
      }
      if (!Array.isArray(raw.track) || raw.track.length === 0 || raw.track.length > MAX_GEO_TRACK_POINTS) {
        return { success: false, error: `Media item ${mediaIndex + 1} has an invalid geographic track.` };
      }

      track = [];
      let previousTime = -Infinity;
      for (const [pointIndex, point] of raw.track.entries()) {
        if (!point || typeof point !== "object") {
          return { success: false, error: `Track point ${pointIndex + 1} is invalid.` };
        }
        const candidate = point as Record<string, unknown>;
        const { lat, lon, accuracy, timeSeconds } = candidate;
        if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90
          || typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180) {
          return { success: false, error: `Track point ${pointIndex + 1} has invalid coordinates.` };
        }
        if (accuracy !== undefined && accuracy !== null
          && (typeof accuracy !== "number" || !Number.isFinite(accuracy) || accuracy < 0)) {
          return { success: false, error: `Track point ${pointIndex + 1} has invalid accuracy.` };
        }
        if (timeSeconds !== undefined && timeSeconds !== null
          && (typeof timeSeconds !== "number" || !Number.isFinite(timeSeconds)
            || timeSeconds < 0 || timeSeconds > MAX_TRACK_TIME_SECONDS)) {
          return { success: false, error: `Track point ${pointIndex + 1} has an invalid timestamp.` };
        }
        if (typeof timeSeconds === "number" && timeSeconds < previousTime) {
          return { success: false, error: "Video track timestamps must be in nondecreasing order." };
        }
        if (typeof timeSeconds === "number") previousTime = timeSeconds;
        track.push({
          lat,
          lon,
          ...(typeof accuracy === "number" ? { accuracy } : {}),
          ...(typeof timeSeconds === "number" ? { timeSeconds } : {}),
        });
      }
    }

    let lat = raw.lat === null ? undefined : raw.lat;
    let lon = raw.lon === null ? undefined : raw.lon;
    const accuracy = raw.accuracy === null ? undefined : raw.accuracy;
    if (lat === undefined && lon === undefined && track?.length) {
      lat = track[0].lat;
      lon = track[0].lon;
    }
    if ((lat === undefined) !== (lon === undefined)
      || (lat !== undefined && (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90))
      || (lon !== undefined && (typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180))) {
      return { success: false, error: `Media item ${mediaIndex + 1} has invalid coordinates.` };
    }
    if (accuracy !== undefined
      && (lat === undefined || lon === undefined
        || typeof accuracy !== "number" || !Number.isFinite(accuracy) || accuracy < 0)) {
      return { success: false, error: `Media item ${mediaIndex + 1} has invalid location accuracy.` };
    }

    media.push({
      type: raw.type,
      url,
      ...(caption ? { caption } : {}),
      ...(typeof lat === "number" && typeof lon === "number" ? { lat, lon } : {}),
      ...(typeof accuracy === "number" ? { accuracy } : {}),
      ...(track ? { track } : {}),
    });
  }

  return { success: true, data: media };
}

async function getOwnedFeedback(feedbackId: string, userId: string) {
  const existing = await db.query.feedback.findFirst({
    where: eq(feedback.id, feedbackId),
  });

  if (!existing) {
    return { status: 404 as const, error: "Feedback not found" };
  }

  if (existing.userId !== userId) {
    return { status: 403 as const, error: "You can only modify your own feedback" };
  }

  return { status: 200 as const, data: existing };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { feedbackId } = await params;
    const ownership = await getOwnedFeedback(feedbackId, session.user.id);

    if (ownership.status !== 200) {
      return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status });
    }

    const body = await request.json();
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    const category = typeof body.category === "string" && FEEDBACK_CATEGORIES.has(body.category)
      ? body.category
      : "general";
    const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
      ? body.rating
      : null;
    const parsedMedia = normalizeMedia(body.media);

    if (!parsedMedia.success) {
      return NextResponse.json({ success: false, error: parsedMedia.error }, { status: 400 });
    }

    const media = parsedMedia.data;

    if (!comment) {
      return NextResponse.json({ success: false, error: "Comment is required" }, { status: 400 });
    }

    if (comment.length > 1000) {
      return NextResponse.json({ success: false, error: "Comment must be 1000 characters or less" }, { status: 400 });
    }

    try {
      assertCleanText(comment);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : "Your message contains inappropriate language." },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(feedback)
      .set({
        rating,
        comment,
        category,
        media,
        isAnonymous: Boolean(body.isAnonymous),
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, feedbackId))
      .returning();

    await logAudit({
      tableName: "feedback",
      recordId: updated.id,
      action: "UPDATE",
      oldValues: { ...ownership.data },
      newValues: { ...updated },
      notes: "Feedback updated by owner",
      context: getAuditContextFromRequest(request, session.user),
    });

    return NextResponse.json({
      success: true,
      data: { ...updated, unhelpfulCount: 0, commentCount: 0 },
      message: "Feedback updated successfully.",
    });
  } catch (error) {
    console.error("Failed to update feedback", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update feedback" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { feedbackId } = await params;
    const ownership = await getOwnedFeedback(feedbackId, session.user.id);

    if (ownership.status !== 200) {
      return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status });
    }

    const media = Array.isArray(ownership.data.media) ? ownership.data.media : [];

    await Promise.allSettled(
      media.map((item) => item?.url ? deleteFile(item.url) : Promise.resolve()),
    );

    await db.delete(feedback).where(eq(feedback.id, feedbackId));

    await logAudit({
      tableName: "feedback",
      recordId: feedbackId,
      action: "DELETE",
      oldValues: { ...ownership.data },
      notes: "Feedback deleted by owner",
      context: getAuditContextFromRequest(request, session.user),
    });

    return NextResponse.json({
      success: true,
      message: "Feedback deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete feedback", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete feedback" },
      { status: 500 },
    );
  }
}
