"use server";

type VoteType = "helpful" | "unhelpful";

interface Voter {
  userId: string;
  name: string | null;
  image: string | null;
  votedAt: Date;
}

export async function getUserVotes(
  _feedbackIds: string[],
): Promise<{ success: true; data: Record<string, VoteType> }> {
  return {
    success: true,
    data: {},
  };
}

export async function getFeedbackVoters(
  _feedbackId: string,
): Promise<{
  success: true;
  data: {
    helpfulVoters: Voter[];
    unhelpfulVoters: Voter[];
  };
}> {
  return {
    success: true,
    data: {
      helpfulVoters: [],
      unhelpfulVoters: [],
    },
  };
}
