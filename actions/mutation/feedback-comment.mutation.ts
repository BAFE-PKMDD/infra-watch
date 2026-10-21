"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { feedback, feedbackComments, feedbackCommentVotes } from "@/lib/db/schema";
import { requireAuth } from "@/lib/session";
import { assertCleanText } from "@/lib/services/content-moderation";
import { notifyPostSubscribers } from "@/lib/post-interactions";
import { enqueueJob } from "@/lib/background-jobs";
import { commentInputSchema } from "@/lib/comment-moderation";
import type { CommentMedia, FeedbackFeedComment } from "@/types/feedback.types";

type CommentPayload = { feedbackId: string; comment: string; media?: CommentMedia[] };
export async function createFeedbackComment(input: CommentPayload): Promise<{ success: boolean; data: FeedbackFeedComment | null; message: string }> {
  try {
    const actor = await requireAuth(); const data = commentInputSchema.parse(input);
    const [parent] = await db.select({ id: feedback.id }).from(feedback).where(and(eq(feedback.id, data.feedbackId), eq(feedback.status, "approved"))).limit(1);
    if (!parent) throw new Error("This feedback is unavailable for comments");
    let rejectionReason: string | null = null;
    try { assertCleanText(data.comment); } catch { rejectionReason = "Text contains inappropriate language"; }
    const status = rejectionReason ? "rejected" : data.media.length ? "pending" : "published";
    const saved = await db.transaction(async tx => {
      const [row] = await tx.insert(feedbackComments).values({ ...data, userId: actor.id, status, autoRejected: Boolean(rejectionReason), rejectionReason }).returning();
      if (status === "pending") await enqueueJob("media-moderation", actor.id, { commentId: row.id, revision: row.revision }, `comment:${row.id}:${row.revision}`, tx);
      return row;
    });
    if (status === "rejected") return { success: false, data: null, message: "Your comment was held for review because it contains inappropriate language." };
    if (status === "published") await notifyPostSubscribers({ postId: data.feedbackId, postType: "feedback", commenterId: actor.id, commenterName: actor.name ?? "Citizen", commentText: data.comment });
    return { success: true, data: status === "pending" ? null : { ...saved, media: saved.media ?? [], user: { id: actor.id, name: actor.name ?? "Citizen", image: typeof actor.image === "string" ? actor.image : null } }, message: status === "pending" ? "Your comment is awaiting media review." : "Comment posted successfully." };
  } catch (error) { return { success: false, data: null, message: error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : "Comment could not be posted." }; }
}
export async function addFeedbackComment(data: CommentPayload) { return createFeedbackComment(data); }

export async function updateFeedbackComment(input: { commentId: string; comment: string; media?: CommentMedia[] }) {
  const actor = await requireAuth();
  const [old] = await db.select().from(feedbackComments).where(and(eq(feedbackComments.id, z.uuid().parse(input.commentId)), eq(feedbackComments.userId, actor.id))).limit(1);
  if (!old) return { success: false, message: "Comment not found" };
  const data = commentInputSchema.parse({ ...input, feedbackId: old.feedbackId, media: input.media ?? old.media ?? [] });
  assertCleanText(data.comment);
  await db.transaction(async tx => {
    const [saved] = await tx.update(feedbackComments).set({ comment: data.comment, media: data.media, status: data.media.length ? "pending" : "published", rejectionReason: null, autoRejected: false, moderatedBy: null, moderatedAt: null, revision: sql`${feedbackComments.revision} + 1`, updatedAt: new Date() }).where(and(eq(feedbackComments.id, old.id), eq(feedbackComments.userId, actor.id), eq(feedbackComments.revision, old.revision))).returning();
    if (!saved) throw new Error("This comment changed. Refresh and try again.");
    if (data.media.length) await enqueueJob("media-moderation", actor.id, { commentId: old.id, revision: saved.revision }, `comment:${old.id}:${saved.revision}`, tx);
  });
  return { success: true, message: data.media.length ? "Comment updated and awaiting media review." : "Comment updated." };
}

export async function deleteFeedbackComment(commentId: string) {
  const actor = await requireAuth();
  const rows = await db.delete(feedbackComments).where(and(eq(feedbackComments.id, z.uuid().parse(commentId)), eq(feedbackComments.userId, actor.id))).returning({ id: feedbackComments.id });
  if (!rows.length) throw new Error("Comment not found");
  return { success: true as const, message: "Comment deleted." };
}

export async function voteComment(data: { commentId: string; voteType: "helpful" | "unhelpful" }) {
  const actor = await requireAuth(); const id = z.uuid().parse(data.commentId); const voteType = z.enum(["helpful", "unhelpful"]).parse(data.voteType);
  return db.transaction(async tx => {
    const [comment] = await tx.select().from(feedbackComments).where(and(eq(feedbackComments.id, id), eq(feedbackComments.status, "published"))).limit(1).for("update");
    if (!comment) throw new Error("Comment not found");
    const [old] = await tx.select().from(feedbackCommentVotes).where(and(eq(feedbackCommentVotes.commentId, id), eq(feedbackCommentVotes.userId, actor.id))).limit(1);
    if (old?.voteType === voteType) await tx.delete(feedbackCommentVotes).where(eq(feedbackCommentVotes.id, old.id));
    else await tx.insert(feedbackCommentVotes).values({ commentId: id, userId: actor.id, voteType }).onConflictDoUpdate({ target: [feedbackCommentVotes.userId, feedbackCommentVotes.commentId], set: { voteType } });
    const [{ helpful, unhelpful }] = await tx.select({ helpful: sql<number>`count(*) filter (where ${feedbackCommentVotes.voteType} = 'helpful')::int`, unhelpful: sql<number>`count(*) filter (where ${feedbackCommentVotes.voteType} = 'unhelpful')::int` }).from(feedbackCommentVotes).where(eq(feedbackCommentVotes.commentId, id));
    await tx.update(feedbackComments).set({ helpfulCount: helpful, unhelpfulCount: unhelpful }).where(eq(feedbackComments.id, id));
    return { success: true as const, data: { helpfulCount: helpful, unhelpfulCount: unhelpful, userVote: old?.voteType === voteType ? null : voteType }, message: "Vote saved." };
  });
}
