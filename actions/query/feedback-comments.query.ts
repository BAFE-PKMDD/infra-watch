"use server";

import { sql } from "drizzle-orm";
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
  _commentIds: string[],
): Promise<{ success: true; data: Record<string, VoteType> }> {
  void _commentIds;
  return {
    success: true,
    data: {},
  };
}

export async function getCommentVoters(
  _commentId: string,
): Promise<{
  success: true;
  data: {
    helpfulVoters: CommentVoter[];
    unhelpfulVoters: CommentVoter[];
  };
}> {
  void _commentId;
  return {
    success: true,
    data: {
      helpfulVoters: [],
      unhelpfulVoters: [],
    },
  };
}
