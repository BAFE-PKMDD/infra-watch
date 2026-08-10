"use server";

type VoteType = "helpful" | "unhelpful";

export async function voteFeedback(data: {
  feedbackId: string;
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

export async function voteComment(data: {
  commentId: string;
  voteType: VoteType;
}) {
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
