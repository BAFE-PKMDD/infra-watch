"use server";

import type { FeedbackFeedComment } from "@/types/feedback.types";

type VoteType = "helpful" | "unhelpful";

interface CommentVoter {
  userId: string;
  name: string | null;
  image: string | null;
  votedAt: Date;
}

export async function getFeedbackComments(
  _feedbackId: string,
): Promise<{ success: true; data: FeedbackFeedComment[] }> {
  void _feedbackId;

  return {
    success: true,
    data: [],
  };
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
