import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { serializeManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import type {
  ManagerialDashboardData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export function dashboardQueryKey(filters: ManagerialDashboardFilters, viewerKey: string) {
  return [
    "managerial-dashboard",
    viewerKey,
    serializeManagerialDashboardFilters(filters).toString(),
  ] as const;
}

export async function fetchManagerialDashboard(
  filters: ManagerialDashboardFilters,
  signal?: AbortSignal,
): Promise<ManagerialDashboardData> {
  const params = serializeManagerialDashboardFilters(filters);
  const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: ManagerialDashboardData;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load dashboard analytics");
  }
  if (!payload.success || !payload.data) {
    throw new Error("Dashboard analytics response is unavailable");
  }
  return payload.data;
}

export function useManagerialDashboard(
  filters: ManagerialDashboardFilters,
  viewerKey: string | undefined,
) {
  return useQuery({
    queryKey: dashboardQueryKey(filters, viewerKey ?? "signed-out"),
    queryFn: ({ signal }) => fetchManagerialDashboard(filters, signal),
    enabled: Boolean(viewerKey),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
