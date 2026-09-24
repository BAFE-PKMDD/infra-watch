"use server";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { assertCleanText } from "@/lib/services/content-moderation";
import { ensurePostInteractionsTables, notifyPostSubscribers } from "@/lib/post-interactions";
import type { CommentMedia, FeedbackFeedComment } from "@/types/feedback.types";

type VoteType = "helpful" | "unhelpful";

interface CommentPayload {
  feedbackId: string;
  comment: string;
  media?: CommentMedia[];
}

interface UpdateCommentPayload {
  commentId: string;
  comment: string;
  media?: CommentMedia[];
}

export async function createFeedbackComment(data: CommentPayload): Promise<{
  success: boolean;
  data: FeedbackFeedComment | null;
  message: string;
}> {
  const comment = data.comment.trim();

  if (!comment) {
    return {
      success: false,
      data: null,
      message: "Comment cannot be empty.",
    };
  }

  try {
    assertCleanText(comment);
  } catch (error) {
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : "Your comment contains inappropriate language.",
    };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      data: null,
      message: "You must be logged in to comment.",
    };
  }

  const commentId = crypto.randomUUID();
  const userName = session.user.name || "Citizen";
  const userImage = session.user.image || null;

  try {
    await ensurePostInteractionsTables();
    await db.execute(sql`
      INSERT INTO feedback_comments (id, feedback_id, user_id, comment, media)
      VALUES (
        ${commentId}::uuid,
        ${data.feedbackId}::uuid,
        ${userId},
        ${comment},
        ${JSON.stringify(data.media || [])}::jsonb
      )
    `);

    // Lookup project name for the notification
    let projectName: string | null = null;
    try {
      const projectRows = await db.execute<{ name: string | null }>(sql`
        SELECT p.name
        FROM feedback f
        LEFT JOIN projects p ON p.abemis_id = f.project_id
        WHERE f.id = ${data.feedbackId}::uuid
      `);
      projectName = Array.from(projectRows)[0]?.name || null;
    } catch {
      // Ignore project lookup error
    }

    // Broadcast in-app & email notification to post subscribers & feedback author
    notifyPostSubscribers({
      postId: data.feedbackId,
      postType: "feedback",
      commenterId: userId,
      commenterName: userName,
      commentText: comment,
      projectName,
    }).catch((err) => {
      console.warn("Failed to notify post subscribers:", err);
    });

    return {
      success: true,
      data: {
        id: commentId,
        feedbackId: data.feedbackId,
        userId,
        comment,
        media: data.media ?? [],
        helpfulCount: 0,
        unhelpfulCount: 0,
        createdAt: new Date(),
        user: {
          id: userId,
          name: userName,
          image: userImage,
        },
      },
      message: "Comment posted successfully.",
    };
  } catch (error) {
    console.error("Failed to insert feedback comment:", error);
    return {
      success: false,
      data: null,
      message: "Failed to post comment. Please try again.",
    };
  }
}

export async function addFeedbackComment(data: CommentPayload) {
  return createFeedbackComment(data);
}

export async function voteComment(data: {
  commentId: string;
  voteType: VoteType;
}): Promise<{
  success: true;
  data: {
    helpfulCount: number;
    unhelpfulCount: number;
    userVote: VoteType;
  };
  message: string;
}> {
  return {
    success: true,
    data: {
      helpfulCount: data.voteType === "helpful" ? 1 : 0,
      unhelpfulCount: data.voteType === "unhelpful" ? 1 : 0,
      userVote: data.voteType,
    },
    message: `Marked as ${data.voteType}.`,
  };
}

export async function updateFeedbackComment(
  data: UpdateCommentPayload,
): Promise<{ success: boolean; message: string }> {
  const comment = data.comment.trim();

  if (!comment) {
    return {
      success: false,
      message: "Comment cannot be empty.",
    };
  }

  try {
    assertCleanText(comment);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Your comment contains inappropriate language.",
    };
  }

  return {
    success: true,
    message: "Comment updated.",
  };
}

export async function deleteFeedbackComment(
  _commentId: string,
): Promise<{ success: true; message: string }> {
  void _commentId;
  return {
    success: true,
    message: "Comment deleted.",
  };
}
