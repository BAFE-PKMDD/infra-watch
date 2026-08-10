import { CheckCircle2, Clock3, Database, Loader2, XCircle } from "lucide-react";

type SyncStatsCardProps = {
  statistics: {
    totalProjects: number;
    lastSync: {
      syncedAt: Date | string;
      status: string;
      projectsAdded: number;
      projectsUpdated: number;
      projectsFailed: number;
      duration: number | null;
    } | null;
  };
};

function formatDuration(duration: number | null) {
  if (duration === null) return "N/A";
  const seconds = Math.max(0, Math.round(duration));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SyncStatsCard({ statistics }: SyncStatsCardProps) {
  const lastSync = statistics.lastSync;
  const failed = lastSync?.status === "failed";
  const running = lastSync?.status === "running";

  return (
    <section className="grid gap-3 md:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Database className="size-4 text-primary" />
          Synced Projects
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{statistics.totalProjects.toLocaleString()}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          {running ? <Loader2 className="size-4 animate-spin text-blue-600" /> : failed ? <XCircle className="size-4 text-red-600" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
          Last Sync
        </div>
        <p className="mt-3 text-sm font-extrabold text-slate-950 dark:text-white">{lastSync ? formatDate(lastSync.syncedAt) : "Never synced"}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Clock3 className="size-4 text-amber-600" />
          Duration
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{formatDuration(lastSync?.duration ?? null)}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Last Result</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <span className="rounded bg-emerald-50 px-2 py-1 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            +{lastSync?.projectsAdded ?? 0}
          </span>
          <span className="rounded bg-blue-50 px-2 py-1 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            {lastSync?.projectsUpdated ?? 0}
          </span>
          <span className="rounded bg-red-50 px-2 py-1 font-bold text-red-700 dark:bg-red-950 dark:text-red-200">
            {lastSync?.projectsFailed ?? 0}
          </span>
        </div>
      </div>
    </section>
  );
}
