import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { serializeManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import type {
  ManagerialDashboardDrillthroughData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export type DashboardDrillthroughOptions = {
  otherProjectTypes?: { excluded: string[] };
};

export function dashboardDrillthroughQueryKey(
  filters: ManagerialDashboardFilters,
  viewerKey: string,
  page: number,
  options?: DashboardDrillthroughOptions,
) {
  return [
    "managerial-dashboard-drillthrough",
    viewerKey,
    serializeManagerialDashboardFilters(filters).toString(),
    page,
    ...(options?.otherProjectTypes ? [`other:${options.otherProjectTypes.excluded.join("|")}`] : []),
  ] as const;
}

export async function fetchDashboardDrillthrough(
  filters: ManagerialDashboardFilters,
  page: number,
  signal?: AbortSignal,
  options?: DashboardDrillthroughOptions,
): Promise<ManagerialDashboardDrillthroughData> {
  const params = serializeManagerialDashboardFilters(filters);
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (options?.otherProjectTypes) {
    params.set("projectTypeGroup", "otherProjectTypes");
    for (const projectType of options.otherProjectTypes.excluded) params.append("excludeProjectType", projectType);
  }
  const response = await fetch(`/api/admin/analytics/drillthrough?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: ManagerialDashboardDrillthroughData;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "Unable to load project details");
  if (!payload.success || !payload.data) throw new Error("Project details are unavailable");
  return payload.data;
}

export function useDashboardDrillthrough(
  filters: ManagerialDashboardFilters,
  viewerKey: string | undefined,
  page: number,
  enabled: boolean,
  options?: DashboardDrillthroughOptions,
) {
  return useQuery({
    queryKey: dashboardDrillthroughQueryKey(filters, viewerKey ?? "signed-out", page, options),
    queryFn: ({ signal }) => fetchDashboardDrillthrough(filters, page, signal, options),
    enabled: enabled && Boolean(viewerKey),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
