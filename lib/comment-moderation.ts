import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { feedback, feedbackComments, projects } from "@/lib/db/schema";
import { getProjectScopeConditions, type ScopedUser } from "@/lib/scope";
import { requirePermission } from "@/lib/permissions";

export const commentInputSchema = z.object({
  feedbackId: z.uuid(),
  comment: z.string().trim().min(1).max(10000),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video"]),
        url: z
          .string()
          .regex(
            /^(?:feedback|feedback-comment)\/\d+-[a-f\d]{32}\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$/i,
            "Use media uploaded through this portal",
          ),
        caption: z.string().trim().max(300).optional(),
      }),
    )
    .max(5)
    .default([]),
});

export async function listModerationComments(
  actor: ScopedUser,
  options: { status?: string; search?: string; page?: number } = {},
) {
  requirePermission(actor.role, "feedback", "list");
  const page = Math.max(1, Math.min(10000, Math.trunc(options.page || 1)));
  const where = and(
    ...getProjectScopeConditions(actor),
    ["pending", "published", "rejected"].includes(options.status ?? "")
      ? eq(
          feedbackComments.status,
          options.status as "pending" | "published" | "rejected",
        )
      : undefined,
    options.search
      ? or(
          ilike(feedbackComments.comment, `%${options.search.slice(0, 200)}%`),
          ilike(projects.name, `%${options.search.slice(0, 200)}%`),
        )
      : undefined,
  );
  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: feedbackComments.id,
        feedbackId: feedbackComments.feedbackId,
        comment: feedbackComments.comment,
        media: feedbackComments.media,
        userId: feedbackComments.userId,
        status: feedbackComments.status,
        autoRejected: feedbackComments.autoRejected,
        rejectionReason: feedbackComments.rejectionReason,
        revision: feedbackComments.revision,
        createdAt: feedbackComments.createdAt,
        projectName: projects.name,
        projectId: projects.abemisId,
      })
      .from(feedbackComments)
      .innerJoin(feedback, eq(feedback.id, feedbackComments.feedbackId))
      .innerJoin(projects, eq(projects.abemisId, feedback.projectId))
      .where(where)
      .orderBy(desc(feedbackComments.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db
      .select({ total: count() })
      .from(feedbackComments)
      .innerJoin(feedback, eq(feedback.id, feedbackComments.feedbackId))
      .innerJoin(projects, eq(projects.abemisId, feedback.projectId))
      .where(where),
  ]);
  return { data, total, page, pageSize: 20 };
}

export async function moderateComment(
  actor: ScopedUser & { id: string },
  id: string,
  input: unknown,
) {
  const data = z
    .object({
      action: z.enum(["publish", "reject"]),
      reason: z.string().trim().min(5).max(1000),
      revision: z.number().int().min(1),
    })
    .parse(input);
  requirePermission(
    actor.role,
    "feedback",
    data.action === "publish" ? "approve" : "reject",
  );
  const [existing] = await db
    .select({ comment: feedbackComments })
    .from(feedbackComments)
    .innerJoin(feedback, eq(feedback.id, feedbackComments.feedbackId))
    .innerJoin(projects, eq(projects.abemisId, feedback.projectId))
    .where(
      and(
        eq(feedbackComments.id, z.uuid().parse(id)),
        ...getProjectScopeConditions(actor),
      ),
    )
    .limit(1);
  if (!existing)
    throw Object.assign(
      new Error("Comment was not found in your assigned scope"),
      { status: 404 },
    );
  const [saved] = await db
    .update(feedbackComments)
    .set({
      status: data.action === "publish" ? "published" : "rejected",
      rejectionReason: data.reason,
      moderatedBy: actor.id,
      moderatedAt: new Date(),
      revision: sql`${feedbackComments.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(feedbackComments.id, id),
        eq(feedbackComments.revision, data.revision),
      ),
    )
    .returning();
  if (!saved)
    throw Object.assign(
      new Error("This comment changed. Refresh before reviewing it."),
      { status: 409 },
    );
  return { saved, existing: existing.comment };
}
