import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { serializeManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import type {
  DashboardBreakdownDimension,
  ManagerialDashboardBreakdownData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export function dashboardBreakdownQueryKey(
  filters: ManagerialDashboardFilters,
  dimension: DashboardBreakdownDimension,
  viewerKey: string,
) {
  return [
    "managerial-dashboard-breakdown",
    viewerKey,
    dimension,
    serializeManagerialDashboardFilters(filters).toString(),
  ] as const;
}

export async function fetchDashboardBreakdown(
  filters: ManagerialDashboardFilters,
  dimension: DashboardBreakdownDimension,
  signal?: AbortSignal,
): Promise<ManagerialDashboardBreakdownData> {
  const params = serializeManagerialDashboardFilters(filters);
  params.set("dimension", dimension);
  const response = await fetch(`/api/admin/analytics/breakdown?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: ManagerialDashboardBreakdownData;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "Unable to load chart breakdown");
  if (!payload.success || !payload.data) throw new Error("Chart breakdown is unavailable");
  return payload.data;
}

export function useDashboardBreakdown(
  filters: ManagerialDashboardFilters,
  dimension: DashboardBreakdownDimension,
  viewerKey: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: dashboardBreakdownQueryKey(filters, dimension, viewerKey ?? "signed-out"),
    queryFn: ({ signal }) => fetchDashboardBreakdown(filters, dimension, signal),
    enabled: enabled && Boolean(viewerKey),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
