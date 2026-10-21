"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  OperationError,
  OperationTable,
  operationDate,
  operationRequest,
} from "./shared";
type Health = {
  checkedAt: string;
  uptimeSeconds: number;
  workerEnabled: boolean;
  checks: { name: string; status: string; latencyMs: number | null }[];
};
export function ServiceHealth() {
  const [automatic, setAutomatic] = useState(true);
  const query = useQuery({
    queryKey: ["service-health"],
    queryFn: () => operationRequest<Health>("/api/health"),
    staleTime: 0,
    refetchInterval: automatic ? 60000 : false,
  });
  const clear = useMutation({
    mutationFn: () =>
      operationRequest<{ removed: number }>("/api/health", "DELETE"),
    onSuccess: () => query.refetch(),
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          className="min-h-11"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          Check services
        </Button>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            className="size-5 accent-primary"
            type="checkbox"
            checked={automatic}
            onChange={(event) => setAutomatic(event.target.checked)}
          />
          Refresh every minute
        </label>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={clear.isPending}
          onClick={() => {
            if (
              window.confirm(
                "Clear cached public data for this InfraWatch instance?",
              )
            )
              clear.mutate();
          }}
        >
          Clear public-data cache
        </Button>
      </div>
      <OperationError error={query.error || clear.error} />
      {clear.isSuccess && (
        <p role="status" className="text-sm">
          Public cache cleared.
        </p>
      )}
      {query.isPending && <p role="status">Checking service availability…</p>}
      {query.data && (
        <>
          <p className="text-sm">
            Checked {operationDate(query.data.checkedAt)} (Asia/Manila).
            Application uptime: {Math.floor(query.data.uptimeSeconds / 60)}{" "}
            minutes.
          </p>
          <p className="text-sm">
            Background worker:{" "}
            <strong>{query.data.workerEnabled ? "Enabled" : "Disabled"}</strong>
          </p>
          {!query.data.workerEnabled && (
            <p
              role="alert"
              className="text-sm text-amber-800 dark:text-amber-200"
            >
              Queued synchronization and media review require the background
              worker to be enabled.
            </p>
          )}
          <OperationTable label="Service availability">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Response time</th>
              </tr>
            </thead>
            <tbody>
              {query.data.checks.map((check) => (
                <tr key={check.name}>
                  <td>{check.name}</td>
                  <td className="capitalize">{check.status}</td>
                  <td>
                    {check.latencyMs === null
                      ? "Not assessed"
                      : `${check.latencyMs} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </OperationTable>
        </>
      )}
    </div>
  );
}
