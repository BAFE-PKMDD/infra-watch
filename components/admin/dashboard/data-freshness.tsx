import { AlertCircle, CheckCircle2, Clock3, DatabaseZap } from "lucide-react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";

export function DataFreshness({
  freshness,
}: {
  freshness: ManagerialDashboardData["freshness"];
}) {
  const failed = freshness.latestSyncStatus === "failed";
  const neverSynced = !freshness.lastSuccessfulSyncAt;
  const label = neverSynced
    ? "Never synced"
    : failed
      ? "Latest sync failed"
      : freshness.isStale
        ? "Stale"
        : "Fresh";
  const Icon = neverSynced ? DatabaseZap : failed ? AlertCircle : freshness.isStale ? Clock3 : CheckCircle2;
  const timestamp = freshness.lastSuccessfulSyncAt
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(new Date(freshness.lastSuccessfulSyncAt))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300" role="status">
      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      {timestamp && (
        <span>
          {failed ? "Last successful data" : "Data as of"} {timestamp}
        </span>
      )}
      {!timestamp && <span>No successful ABEMIS project synchronization is recorded.</span>}
      <span className="text-xs">Stale after {freshness.staleAfterHours} hours</span>
    </div>
  );
}
