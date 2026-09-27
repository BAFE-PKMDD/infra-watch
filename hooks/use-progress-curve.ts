import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ManagerialDashboardProgressCurveData } from "@/types/managerial-dashboard.types";

export function progressCurveQueryKey(projectId: string, viewerKey: string) {
  return ["managerial-dashboard-progress-curve", viewerKey, projectId] as const;
}

export async function fetchProgressCurve(
  projectId: string,
  signal?: AbortSignal,
): Promise<ManagerialDashboardProgressCurveData> {
  const params = new URLSearchParams({ projectId });
  const response = await fetch(`/api/admin/analytics/progress-curve?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: ManagerialDashboardProgressCurveData;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "Unable to load the progress curve");
  if (!payload.success || !payload.data) throw new Error("Progress curve is unavailable");
  return payload.data;
}

export function useProgressCurve(projectId: string | undefined, viewerKey: string | undefined) {
  return useQuery({
    queryKey: progressCurveQueryKey(projectId ?? "", viewerKey ?? "signed-out"),
    queryFn: ({ signal }) => fetchProgressCurve(projectId as string, signal),
    enabled: Boolean(projectId) && Boolean(viewerKey),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
