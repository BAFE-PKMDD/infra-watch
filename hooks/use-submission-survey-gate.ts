"use client";

import { useQuery } from "@tanstack/react-query";

export const submissionSurveyStatusQueryKey = ["submission-survey-status"] as const;

/**
 * Fails open: a non-OK response or an unparseable body is treated as "already
 * responded" so a broken status check never blocks citizen reporting.
 */
export async function fetchSubmissionSurveyStatus(): Promise<{ hasResponded: boolean }> {
  const response = await fetch("/api/submission-survey/status");
  if (!response.ok) return { hasResponded: true };
  const result = await response.json().catch(() => null);
  return { hasResponded: Boolean(result?.data?.hasResponded ?? true) };
}

/**
 * Whether this account still needs the "who's using InfraWatch" survey shown before
 * their next e-report or feedback submission. It should interrupt an account at most
 * once, ever, regardless of which surface they submit on first.
 *
 * Fails open: while the check is still loading, `needsSurvey` is false so a slow or
 * flaky status lookup never blocks citizen reporting.
 */
export function useSubmissionSurveyGate(enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: submissionSurveyStatusQueryKey,
    queryFn: fetchSubmissionSurveyStatus,
    enabled,
    staleTime: Infinity,
  });

  return {
    needsSurvey: Boolean(data && !data.hasResponded),
    isSurveyStatusLoading: enabled && isLoading,
  };
}
