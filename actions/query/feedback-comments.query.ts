"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { feedbackCommentVotes, feedbackComments } from "@/lib/db/schema";
import { user } from "@/auth-schema";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensurePostInteractionsTables } from "@/lib/post-interactions";
import type { FeedbackFeedComment } from "@/types/feedback.types";

type VoteType = "helpful" | "unhelpful";

interface CommentVoter {
  userId: string;
  name: string | null;
  image: string | null;
  votedAt: Date;
}

export async function getFeedbackComments(
  feedbackId: string,
): Promise<{ success: boolean; data: FeedbackFeedComment[] }> {
  try {
    await ensurePostInteractionsTables();
    const rows = await db.execute<{
      id: string;
      feedback_id: string;
      user_id: string;
      comment: string;
      media: unknown;
      helpful_count: number;
      unhelpful_count: number;
      created_at: string;
      user_name: string | null;
      user_image: string | null;
    }>(sql`
      SELECT 
        c.id,
        c.feedback_id,
        c.user_id,
        c.comment,
        c.media,
        c.helpful_count,
        c.unhelpful_count,
        c.created_at,
        u.name as user_name,
        u.image as user_image
      FROM feedback_comments c
      LEFT JOIN "user" u ON u.id = c.user_id
      WHERE c.feedback_id = ${feedbackId}::uuid
        AND c.status = 'published'
        AND EXISTS (SELECT 1 FROM feedback f WHERE f.id = c.feedback_id AND f.status = 'approved')
      ORDER BY c.created_at ASC
    `);

    // The auto-accept feedback flow (app/api/projects/[id]/feedback/route.ts) posts its
    // acknowledgment as a feedback_comments row authored by this literal system actor ID,
    // which has no matching "user" row — label it explicitly instead of falling back to
    // the generic "Citizen" the LEFT JOIN would otherwise produce.
    const comments: FeedbackFeedComment[] = Array.from(rows).map((row) => ({
      id: row.id,
      feedbackId: row.feedback_id,
      userId: row.user_id,
      comment: row.comment,
      media: Array.isArray(row.media) ? row.media : [],
      helpfulCount: row.helpful_count,
      unhelpfulCount: row.unhelpful_count,
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        name: row.user_id === "system-auto-acceptance" ? "InfraWatch Automated System" : (row.user_name || "Citizen"),
        image: row.user_image,
      },
    }));

    return {
      success: true,
      data: comments,
    };
  } catch (error) {
    console.error("Error fetching feedback comments:", error);
    return {
      success: true,
      data: [],
    };
  }
}

export async function getUserCommentVotes(
  commentIds: string[],
): Promise<{ success: true; data: Record<string, VoteType> }> {
  const actor = await getCurrentUser();
  if (!actor || !commentIds.length) return { success: true, data: {} };
  const ids = z.array(z.uuid()).max(500).parse(commentIds);
  const rows = await db.select().from(feedbackCommentVotes).where(and(eq(feedbackCommentVotes.userId, actor.id), inArray(feedbackCommentVotes.commentId, ids)));
  return {
    success: true,
    data: Object.fromEntries(rows.map(row => [row.commentId, row.voteType])),
  };
}

export async function getCommentVoters(
  commentId: string,
): Promise<{
  success: true;
  data: {
    helpfulVoters: CommentVoter[];
    unhelpfulVoters: CommentVoter[];
  };
}> {
  const rows = await db.select({ userId: feedbackCommentVotes.userId, name: user.name, image: user.image, votedAt: feedbackCommentVotes.createdAt, voteType: feedbackCommentVotes.voteType }).from(feedbackCommentVotes).innerJoin(feedbackComments, eq(feedbackComments.id, feedbackCommentVotes.commentId)).leftJoin(user, eq(user.id, feedbackCommentVotes.userId)).where(and(eq(feedbackCommentVotes.commentId, z.uuid().parse(commentId)), eq(feedbackComments.status, "published"))).limit(200);
  return {
    success: true,
    data: {
      helpfulVoters: rows.filter(row => row.voteType === "helpful"),
      unhelpfulVoters: rows.filter(row => row.voteType === "unhelpful"),
    },
  };
}
