"use client";

import type { CompletionDelayBucket, ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

const BUCKET_LABELS: Record<CompletionDelayBucket, string> = {
  onTimeOrEarly: "On time or early",
  late1to30: "1-30 days late",
  late31to90: "31-90 days late",
  late91to180: "91-180 days late",
  late181to365: "181-365 days late",
  lateOver365: "Over a year late",
};

const BUCKET_COLORS: Record<CompletionDelayBucket, string> = {
  onTimeOrEarly: "var(--a-s3, #2563eb)",
  late1to30: "var(--a-warn, #fbbf24)",
  late31to90: "var(--a-serious, #f97316)",
  late91to180: "var(--a-crit, #ef4444)",
  late181to365: "var(--a-crit, #dc2626)",
  lateOver365: "var(--a-crit, #991b1b)",
};

export function CompletionDelayHistogram({ data }: { data: ManagerialDashboardData["completionDelayBuckets"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Did construction finish on time?"
        description="Completed projects grouped by how many days past the deadline they finished, where the deadline is the target completion date."
        summary="Completion-delay data is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Completion-delay data is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const total = data.reduce((sum, row) => sum + row.count, 0);
  const summary = total > 0
    ? data.map((row) => `${BUCKET_LABELS[row.bucket]}: ${row.count.toLocaleString("en-PH")}`).join("; ")
    : "No completed projects have both a target and an actual completion date.";

  return (
    <ChartPanel
      title="Did construction finish on time?"
      description="Completed projects with both a target and an actual completion date, grouped by how many days past the deadline they finished."
      summary={summary}
    >
      {total === 0 ? <ChartEmptyState /> : (
        <>
          <div
            role="img"
            aria-label={`Of ${total.toLocaleString("en-PH")} completed projects with dates: ${data.map((row) => `${BUCKET_LABELS[row.bucket]} ${row.count.toLocaleString("en-PH")}`).join(", ")}`}
            className="flex h-8 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
          >
            {data.map((row) => row.count > 0 ? (
              <div
                key={row.bucket}
                style={{ width: `${(row.count / total) * 100}%`, background: BUCKET_COLORS[row.bucket] }}
                title={`${BUCKET_LABELS[row.bucket]}: ${row.count.toLocaleString("en-PH")} (${((row.count / total) * 100).toFixed(1)}%)`}
              />
            ) : null)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{total.toLocaleString("en-PH")} completed projects with both dates on file</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 list-none p-0">
            {data.map((row) => (
              <li key={row.bucket} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[2px]" style={{ background: BUCKET_COLORS[row.bucket] }} />
                <span className="text-slate-700 dark:text-slate-200">{BUCKET_LABELS[row.bucket]}</span>
                <span className="text-slate-500 dark:text-slate-400">· {row.count.toLocaleString("en-PH")}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartPanel>
  );
}
