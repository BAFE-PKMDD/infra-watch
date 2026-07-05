import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SyncLogsResponse, SyncTriggerRequest, SyncTriggerResponse } from "@/types/sync.types";

export function useSyncLogs(options?: { limit?: number; includeStats?: boolean }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.includeStats) params.set("includeStats", "true");

  const query = params.toString();

  return useQuery<SyncLogsResponse>({
    queryKey: ["sync-logs", options],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sync-logs${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sync logs");
      }
      return response.json();
    },
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation<SyncTriggerResponse, Error, SyncTriggerRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || body.error || "Failed to run sync");
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
    },
  });
}
