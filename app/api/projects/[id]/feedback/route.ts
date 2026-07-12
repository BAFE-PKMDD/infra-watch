import { NextRequest, NextResponse } from "next/server";
import { user as authUser } from "@/auth-schema";
import { auth } from "@/lib/auth";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { feedback, projects } from "@/lib/db/schema";
import { publishNotification } from "@/lib/realtime-notifications";
import { assertCleanText } from "@/lib/services/content-moderation";
import { and, desc, eq, or, sql } from "drizzle-orm";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

async function resolveProjectKey(projectId: string) {
  const condition = UUID_RE.test(projectId)
    ? or(
      eq(projects.id, projectId),
      eq(projects.abemisId, projectId),
      eq(projects.projectCode, projectId),
    )
    : or(
      eq(projects.abemisId, projectId),
      eq(projects.projectCode, projectId),
    );

  const [project] = await db
    .select({
      id: projects.id,
      abemisId: projects.abemisId,
      projectCode: projects.projectCode,
    })
    .from(projects)
    .where(condition)
    .limit(1);

  return project?.abemisId ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const projectKey = await resolveProjectKey(id);

    if (!projectKey) {
      return NextResponse.json({ success: false, error: "Project not found", data: [] }, { status: 404 });
    }

    const rows = await db
      .select({
        id: feedback.id,
        projectId: feedback.projectId,
        userId: feedback.userId,
        rating: feedback.rating,
        comment: feedback.comment,
        category: feedback.category,
        media: feedback.media,
        isAnonymous: feedback.isAnonymous,
        helpfulCount: feedback.helpfulCount,
        status: feedback.status,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        userName: authUser.name,
        userImage: authUser.image,
        commentCount: sql<number>`0`,
      })
      .from(feedback)
      .leftJoin(authUser, eq(authUser.id, feedback.userId))
      .where(and(eq(feedback.projectId, projectKey), eq(feedback.status, "approved")))
      .orderBy(desc(feedback.createdAt));

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        userId: row.userId,
        rating: row.rating,
        comment: row.comment ?? "",
        category: row.category ?? "general",
        media: row.media ?? [],
        isAnonymous: row.isAnonymous,
        helpfulCount: row.helpfulCount,
        unhelpfulCount: 0,
        commentCount: row.commentCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: row.isAnonymous || !row.userId
          ? null
          : {
            id: row.userId,
            name: row.userName,
            image: row.userImage,
          },
      })),
    });
  } catch (error) {
    console.error("Failed to fetch feedback", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback", data: [] },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const projectKey = await resolveProjectKey(id);

    if (!projectKey) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
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

    const [created] = await db
      .insert(feedback)
      .values({
        projectId: projectKey,
        userId: session.user.id,
        rating,
        comment,
        category,
        media,
        isAnonymous: Boolean(body.isAnonymous),
        helpfulCount: 0,
        status: "pending",
      })
      .returning();

    publishNotification({
      type: "feedback_submitted",
      title: "New feedback submitted",
      message: "A citizen submitted feedback for review.",
      metadata: {
        feedbackId: created.id,
        projectId: projectKey,
        category,
      },
    });

    await logAudit({
      tableName: "feedback",
      recordId: created.id,
      action: "CREATE",
      newValues: { ...created },
      notes: "Feedback submitted for moderation",
      context: getAuditContextFromRequest(request, session.user),
    });

    return NextResponse.json({
      success: true,
      data: { ...created, unhelpfulCount: 0, commentCount: 0 },
      message: "Feedback submitted successfully and is pending review.",
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit feedback", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
