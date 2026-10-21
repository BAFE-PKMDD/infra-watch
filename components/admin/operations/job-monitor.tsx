"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  OperationError,
  OperationTable,
  operationDate,
  operationRequest,
} from "./shared";

type Job = {
  id: string;
  status: string;
  kind: string;
  attempts: number;
  createdAt: string;
  progress: { processed: number; total: number; message: string };
  error: string | null;
};
export function JobMonitor({
  kind,
}: {
  kind: "abemis-sync" | "location-sync";
}) {
  const client = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const query = useQuery({
    queryKey: ["operations-jobs", kind],
    queryFn: () =>
      operationRequest<{ data: Job[] }>(`/api/admin/jobs?kind=${kind}`),
    refetchInterval: 15000,
    staleTime: 0,
  });
  const active = query.data?.data.find(
    (job) => job.status === "queued" || job.status === "running",
  );
  const activeId = active?.id;
  const trigger = useMutation({
    mutationFn: (retryId?: string) =>
      operationRequest(
        "/api/admin/jobs",
        retryId ? "PATCH" : "POST",
        retryId ? { id: retryId } : { kind },
      ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["operations-jobs", kind] }),
  });
  useEffect(() => {
    if (!activeId) return;
    const source = new EventSource(`/api/admin/jobs/${activeId}/stream`);
    source.addEventListener("progress", (event) => {
      setStreaming(true);
      const update = JSON.parse(
        (event as MessageEvent).data,
      ) as Partial<Job> & { id: string };
      client.setQueryData<{ data: Job[] }>(["operations-jobs", kind], (old) =>
        old
          ? {
              data: old.data.map((job) =>
                job.id === update.id ? { ...job, ...update } : job,
              ),
            }
          : old,
      );
      if (update.status === "completed" || update.status === "failed") {
        source.close();
        void client.invalidateQueries({ queryKey: ["location-history"] });
        void client.invalidateQueries({ queryKey: ["sync-logs"] });
      }
    });
    source.onerror = () => setStreaming(false);
    return () => source.close();
  }, [activeId, client, kind]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="min-h-11"
          disabled={trigger.isPending || Boolean(active)}
          onClick={() => {
            if (
              window.confirm(
                kind === "abemis-sync"
                  ? "Synchronize project records from ABEMIS?"
                  : "Synchronize PSGC master locations?",
              )
            )
              trigger.mutate(undefined);
          }}
        >
          {active ? "Synchronization in progress" : "Start synchronization"}
        </Button>
        <Button
          className="min-h-11"
          variant="outline"
          onClick={() => query.refetch()}
        >
          Refresh history
        </Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Synchronization runs in the background. You can leave this page and
        return to its saved progress.
      </p>
      <OperationError error={query.error || trigger.error} />
      {query.isPending && <p role="status">Loading synchronization history…</p>}
      {active && (
        <section
          className="space-y-2 border-l-4 border-primary pl-4"
          aria-label="Synchronization progress"
        >
          <p role="status" className="text-sm font-semibold">
            {active.progress.message}
          </p>
          {active.progress.total > 0 && (
            <>
              <progress
                className="h-3 w-full accent-primary"
                value={Math.min(
                  active.progress.processed,
                  active.progress.total,
                )}
                max={active.progress.total}
              />
              <p className="text-sm">
                {active.progress.processed.toLocaleString()} of{" "}
                {active.progress.total.toLocaleString()} records
              </p>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            {streaming
              ? "Live progress connected"
              : "Connecting to saved progress"}
          </p>
        </section>
      )}
      {query.data?.data.length ? (
        <OperationTable label="Synchronization jobs">
          <thead>
            <tr>
              <th>Started (Asia/Manila)</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Attempts</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {query.data.data.map((job) => (
              <tr key={job.id}>
                <td>{operationDate(job.createdAt)}</td>
                <td className="capitalize">{job.status}</td>
                <td>
                  <p>{job.progress.message}</p>
                  {job.error && (
                    <p className="mt-1 text-red-700 dark:text-red-300">
                      {job.error}
                    </p>
                  )}
                </td>
                <td>{job.attempts}</td>
                <td>
                  {job.status === "failed" && (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={trigger.isPending}
                      onClick={() => trigger.mutate(job.id)}
                    >
                      Retry synchronization
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </OperationTable>
      ) : (
        query.data && (
          <p className="text-sm">
            No background synchronizations have been recorded yet.
          </p>
        )
      )}
    </div>
  );
}
