import { useQuery } from "@tanstack/react-query";

import { serializeManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import type {
  ManagerialDashboardData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export function dashboardQueryKey(filters: ManagerialDashboardFilters) {
  return [
    "managerial-dashboard",
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
  if (!response.ok) {
    throw new Error("Unable to load dashboard analytics");
  }
  const payload = (await response.json()) as {
    success: boolean;
    data?: ManagerialDashboardData;
  };
  if (!payload.success || !payload.data) {
    throw new Error("Dashboard analytics response is unavailable");
  }
  return payload.data;
}

export function useManagerialDashboard(filters: ManagerialDashboardFilters) {
  return useQuery({
    queryKey: dashboardQueryKey(filters),
    queryFn: ({ signal }) => fetchManagerialDashboard(filters, signal),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
