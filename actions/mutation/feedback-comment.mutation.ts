"use server";

import { assertCleanText } from "@/lib/services/content-moderation";
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

  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      feedbackId: data.feedbackId,
      userId: "",
      comment,
      media: data.media ?? [],
      helpfulCount: 0,
      unhelpfulCount: 0,
      createdAt: new Date(),
      user: {
        id: "",
        name: "Citizen",
        image: null,
      },
    },
    message: "Comment accepted.",
  };
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
  return {
    success: true,
    message: "Comment deleted.",
  };
}
