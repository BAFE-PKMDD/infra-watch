import { AlertTriangle, Database, LoaderCircle } from "lucide-react";

export function DashboardState({
  state,
  message,
}: {
  state: "loading" | "error" | "empty" | "stale" | "refreshError";
  message?: string;
}) {
  if (state === "loading") {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <LoaderCircle className="size-5 animate-spin text-primary motion-reduce:animate-none" />
        Loading dashboard analytics…
      </div>
    );
  }
  if (state === "error") {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
        <AlertTriangle className="size-5" />
        {message ?? "Unable to load analytics. Try refreshing the dashboard."}
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <Database className="size-5" />
        No projects match the current scope and filters.
      </div>
    );
  }
  if (state === "refreshError") {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="size-4" />
        Refresh failed. Showing the last successfully loaded dashboard snapshot.
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="size-4" />
      Dashboard data may be stale. Check the data-as-of time before deciding.
    </div>
  );
}
