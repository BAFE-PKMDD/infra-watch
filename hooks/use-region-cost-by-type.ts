import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { serializeManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import type {
  ManagerialDashboardCostByRegionData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export function regionCostByTypeQueryKey(
  filters: ManagerialDashboardFilters,
  projectType: string,
  viewerKey: string,
) {
  return [
    "managerial-dashboard-cost-by-region",
    viewerKey,
    projectType,
    serializeManagerialDashboardFilters(filters).toString(),
  ] as const;
}

export async function fetchRegionCostByType(
  filters: ManagerialDashboardFilters,
  projectType: string,
  signal?: AbortSignal,
): Promise<ManagerialDashboardCostByRegionData> {
  const params = serializeManagerialDashboardFilters(filters);
  params.set("facilityType", projectType);
  const response = await fetch(`/api/admin/analytics/cost-by-region?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: ManagerialDashboardCostByRegionData;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "Unable to load cost-by-region breakdown");
  if (!payload.success || !payload.data) throw new Error("Cost-by-region breakdown is unavailable");
  return payload.data;
}

export function useRegionCostByType(
  filters: ManagerialDashboardFilters,
  projectType: string | undefined,
  viewerKey: string | undefined,
) {
  return useQuery({
    queryKey: regionCostByTypeQueryKey(filters, projectType ?? "", viewerKey ?? "signed-out"),
    queryFn: ({ signal }) => fetchRegionCostByType(filters, projectType as string, signal),
    enabled: Boolean(projectType) && Boolean(viewerKey),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
