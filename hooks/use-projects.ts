import { useQuery } from "@tanstack/react-query";

type ProjectFilters = {
  search?: string;
  status?: string;
  program?: string;
  region?: string;
  province?: string;
  page?: number;
  pageSize?: number;
};

export function useAdminProjects(filters: ProjectFilters) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    pageSize: String(filters.pageSize ?? 25),
  });

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.program) params.set("program", filters.program);
  if (filters.region) params.set("region", filters.region);
  if (filters.province) params.set("province", filters.province);

  return useQuery({
    queryKey: ["admin-projects", filters],
    queryFn: async () => {
      const response = await fetch(`/api/admin/projects?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return response.json();
    },
  });
}

export function useAdminProjectStats() {
  return useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/projects/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch project statistics");
      }
      return response.json();
    },
  });
}
