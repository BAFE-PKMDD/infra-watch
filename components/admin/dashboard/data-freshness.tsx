import { AlertCircle, AlertTriangle, CheckCircle2, DatabaseZap } from "lucide-react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";

export function DataFreshness({
  freshness,
  asOf,
}: {
  freshness: ManagerialDashboardData["freshness"];
  asOf?: string;
}) {
  const failed = freshness.latestSyncStatus === "failed";
  const neverSynced = !freshness.lastSuccessfulSyncAt;
  const label = neverSynced
    ? "Never synced"
    : failed
      ? "Latest sync failed"
      : freshness.isStale
        ? "Stale data"
        : "Fresh";
  const Icon = neverSynced ? DatabaseZap : failed ? AlertCircle : freshness.isStale ? AlertTriangle : CheckCircle2;
  const timestamp = freshness.lastSuccessfulSyncAt
    ? formatTimestamp(freshness.lastSuccessfulSyncAt)
    : null;
  const ageLabel = freshness.lastSuccessfulSyncAt && asOf
    ? formatDataAge(freshness.lastSuccessfulSyncAt, asOf)
    : null;

  return (
    <div role="status" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      <span className={freshness.isStale || failed || neverSynced ? "inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300" : "inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100"}>
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      {timestamp ? (
        <span>
          Last successful sync <time dateTime={freshness.lastSuccessfulSyncAt ?? undefined}>{timestamp}</time>
        </span>
      ) : (
        <span>No successful ABEMIS project synchronization is recorded.</span>
      )}
      <span className="text-slate-400" aria-hidden="true">•</span>
      <span>{ageLabel ? `Data age: ${ageLabel}` : `Stale after ${freshness.staleAfterHours} hours`}</span>
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatDataAge(lastSuccessfulSyncAt: string, asOf: string) {
  const sync = new Date(lastSuccessfulSyncAt);
  const reference = new Date(`${asOf}T00:00:00+08:00`);
  if (Number.isNaN(sync.getTime()) || Number.isNaN(reference.getTime())) return null;
  const elapsedHours = Math.max(0, Math.floor((reference.getTime() - sync.getTime()) / 3_600_000));
  if (elapsedHours < 24) return "less than 1 day";
  const days = Math.floor(elapsedHours / 24);
  return `${days.toLocaleString("en-PH")} ${days === 1 ? "day" : "days"}`;
}
