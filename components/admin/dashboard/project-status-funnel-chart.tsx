"use client";

import type { ManagerialDashboardData, ProjectStatusFilter } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { PROJECT_STATUS_LABELS as STATUS_LABELS } from "./dashboard-filters";
import { formatDashboardCurrency } from "./executive-kpis";

const STATUS_COLORS: Record<ProjectStatusFilter, string> = {
  planned: "var(--a-s2, #5598e7)",
  ongoing: "var(--a-s4, #1c5cab)",
  completed: "var(--a-good, #16a34a)",
  suspended: "var(--a-crit, #dc2626)",
};

const STATUS_ORDER: ProjectStatusFilter[] = ["planned", "ongoing", "completed", "suspended"];

export function ProjectStatusFunnelChart({ data }: { data: ManagerialDashboardData["statusBreakdown"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Where are the projects now?"
        description="The portfolio's current stage split: planned, ongoing, completed, or suspended."
        summary="Stage split is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Stage split is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const byKey = new Map(data.map((row) => [row.key, row]));
  const rows = STATUS_ORDER
    .map((key) => ({ key, count: byKey.get(key)?.count ?? 0, budget: byKey.get(key)?.allocatedBudget ?? 0 }))
    .filter((row) => row.count > 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const summary = rows.length > 0
    ? rows.map((row) => `${STATUS_LABELS[row.key]}: ${row.count.toLocaleString("en-PH")} projects, ${formatDashboardCurrency(row.budget)} allocated`).join("; ")
    : "No project status data is available.";

  return (
    <ChartPanel
      title="Where are the projects now?"
      description="The portfolio's current stage split: planned, ongoing, completed, or suspended."
      summary={summary}
    >
      {rows.length === 0 ? <ChartEmptyState /> : (
        <>
          <div
            role="img"
            aria-label={`Of ${total.toLocaleString("en-PH")} total projects: ${rows.map((row) => `${STATUS_LABELS[row.key]} ${row.count.toLocaleString("en-PH")}`).join(", ")}`}
            className="flex h-7 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
          >
            {rows.map((row) => (
              <div
                key={row.key}
                style={{ width: `${(row.count / Math.max(total, 1)) * 100}%`, background: STATUS_COLORS[row.key] }}
                title={`${STATUS_LABELS[row.key]}: ${row.count.toLocaleString("en-PH")} (${((row.count / Math.max(total, 1)) * 100).toFixed(1)}%)`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{total.toLocaleString("en-PH")} total projects</p>

          <ul className="mt-4 grid list-none gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
            {rows.map((row) => {
              const pct = (row.count / Math.max(total, 1)) * 100;
              return (
                <li key={row.key} className="flex items-start gap-2.5 px-2 py-1.5">
                  <span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-[2px]" style={{ background: STATUS_COLORS[row.key] }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{STATUS_LABELS[row.key]}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {row.count.toLocaleString("en-PH")} projects · {pct.toFixed(1)}% · {formatDashboardCurrency(row.budget)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ChartPanel>
  );
}
