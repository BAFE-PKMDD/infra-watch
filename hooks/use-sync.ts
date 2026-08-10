import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SyncLogsResponse, SyncTriggerRequest, SyncTriggerResponse } from "@/types/sync.types";

type SyncLogsQueryKey = readonly ["sync-logs", { limit: number | null; includeStats: boolean }];

export function useSyncLogs(options?: {
  limit?: number;
  includeStats?: boolean;
  refetchInterval?: number | false;
  pollWhileRunning?: boolean;
  forcePolling?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.includeStats) params.set("includeStats", "true");

  const query = params.toString();
  const queryKey: SyncLogsQueryKey = ["sync-logs", { limit: options?.limit ?? null, includeStats: Boolean(options?.includeStats) }];

  return useQuery<SyncLogsResponse, Error, SyncLogsResponse, SyncLogsQueryKey>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/admin/sync-logs${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch sync logs");
      }
      return response.json();
    },
    refetchInterval: options?.refetchInterval ?? ((query) => {
      if (options?.forcePolling) return 2000;
      if (!options?.pollWhileRunning) return false;
      return query.state.data?.logs.some((log) => log.status === "running") ? 2000 : false;
    }),
    refetchOnWindowFocus: true,
    staleTime: 0,
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

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.message || body.error || "Failed to run sync");
      }

      return body;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
    },
  });
}
