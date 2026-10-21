"use client";
import { useQuery } from "@tanstack/react-query";
import { JobMonitor } from "./job-monitor";
import {
  OperationError,
  OperationTable,
  operationDate,
  operationRequest,
} from "./shared";
export function LocationSync() {
  const query = useQuery({
    queryKey: ["location-history"],
    queryFn: () =>
      operationRequest<{
        count: number;
        logs: {
          id: string;
          status: string;
          startedAt: string;
          totalProcessed: number;
        }[];
      }>("/api/admin/locations"),
    refetchInterval: 15000,
  });
  return (
    <div className="space-y-8">
      <p className="text-sm">
        Stored location records:{" "}
        <strong>{query.data?.count.toLocaleString() ?? "Unavailable"}</strong>
      </p>
      <OperationError error={query.error} />
      <JobMonitor kind="location-sync" />
      {query.data?.logs.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">PSGC synchronization log</h2>
          <OperationTable label="PSGC source synchronization log">
            <thead>
              <tr>
                <th>Started (Asia/Manila)</th>
                <th>Status</th>
                <th>Processed records</th>
              </tr>
            </thead>
            <tbody>
              {query.data.logs.map((log) => (
                <tr key={log.id}>
                  <td>{operationDate(log.startedAt)}</td>
                  <td>{log.status}</td>
                  <td>{log.totalProcessed}</td>
                </tr>
              ))}
            </tbody>
          </OperationTable>
        </section>
      ) : null}
    </div>
  );
}
