import { useQuery } from "@tanstack/react-query";

import type { DataQualityIssueType, DataQualityReport } from "@/types/data-quality.types";

export type DataQualityFilters = {
  type?: DataQualityIssueType;
  search?: string;
  page: number;
  pageSize: number;
};

export function useDataQualityReport(filters: DataQualityFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);

  return useQuery<DataQualityReport>({
    queryKey: ["data-quality", 2, filters],
    queryFn: async () => {
      const response = await fetch(`/api/admin/data-quality?${params.toString()}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Failed to analyze project data");
      return body;
    },
  });
}
