import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/minio";
import { feedback } from "@/lib/db/schema";
import { assertCleanText } from "@/lib/services/content-moderation";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const FEEDBACK_CATEGORIES = new Set(["quality", "progress", "concerns", "general"]);

type FeedbackMedia = {
  type: "image" | "video";
  url: string;
  caption?: string;
};

function normalizeMedia(value: unknown): FeedbackMedia[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 5)
    .flatMap((item) => {
      if (
        item &&
        typeof item === "object" &&
        (item as FeedbackMedia).url &&
        typeof (item as FeedbackMedia).url === "string" &&
        ((item as FeedbackMedia).type === "image" || (item as FeedbackMedia).type === "video")
      ) {
        return [{
          type: (item as FeedbackMedia).type,
          url: (item as FeedbackMedia).url,
          caption: typeof (item as FeedbackMedia).caption === "string"
            ? (item as FeedbackMedia).caption
            : undefined,
        }];
      }

      return [];
    });
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
    const media = normalizeMedia(body.media);

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

    if (Array.isArray(body.media) && body.media.length > 5) {
      return NextResponse.json({ success: false, error: "Maximum 5 media files allowed" }, { status: 400 });
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
