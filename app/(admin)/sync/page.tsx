"use client";

import { AlertCircle, AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { useState } from "react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SyncLogsTable } from "@/components/admin/sync/sync-logs-table";
import { SyncStatsCard } from "@/components/admin/sync/sync-stats-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useSyncLogs, useTriggerSync } from "@/hooks/use-sync";

export default function SyncPage() {
  const [message, setMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useSyncLogs({ includeStats: true });
  const triggerSync = useTriggerSync();
  const canTrigger = user?.role === "admin";

  const logs = data?.logs ?? [];
  const statistics = data?.statistics ?? null;

  const handleSync = async () => {
    if (!window.confirm("Fetch AMEFIP/INS project records from ABEMIS and upsert the local read model?")) {
      return;
    }

    setMessage("Sync started. Keep this page open until the request completes.");

    triggerSync.mutate(
      { syncType: "manual" },
      {
        onSuccess: (result) => {
          const stats = result.statistics;
          setMessage(
            `Sync complete. Added ${stats?.projectsAdded ?? 0}, updated ${stats?.projectsUpdated ?? 0}, failed ${stats?.projectsFailed ?? 0}.`,
          );
          refetch();
        },
        onError: (syncError) => {
          setMessage(syncError.message);
        },
      },
    );
  };

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "System" }, { label: "ABEMIS Sync" }]}
      title="ABEMIS Sync"
      description="Synchronize AMEFIP and INS project records from ABEMIS into the local InfraWatch read model."
    >
      {message && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {message}
        </div>
      )}

      {(error || triggerSync.error) && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4" />
          {error instanceof Error ? error.message : triggerSync.error?.message ?? "Sync failed"}
        </div>
      )}

      {statistics && <SyncStatsCard statistics={statistics} />}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Sync History</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manual syncs update existing source records instead of creating project records by hand.</p>
          </div>

          {canTrigger ? (
            <Button type="button" onClick={handleSync} disabled={triggerSync.isPending}>
              <RefreshCw className={triggerSync.isPending ? "size-4 animate-spin" : "size-4"} />
              {triggerSync.isPending ? "Syncing..." : "Sync Now"}
            </Button>
          ) : (
            <Button type="button" disabled variant="outline">
              <Lock className="size-4" />
              View only
            </Button>
          )}
        </div>

        {triggerSync.isPending && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4" />
            Sync can take several minutes depending on ABEMIS response time and record count.
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            Loading sync logs...
          </div>
        ) : (
          <SyncLogsTable logs={logs} />
        )}
      </section>
    </AdminPageWrapper>
  );
}
