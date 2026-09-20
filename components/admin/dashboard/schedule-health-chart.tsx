"use client";

import { Eye, Filter, SlidersHorizontal } from "lucide-react";

import type { ManagerialDashboardData, ScheduleHealth } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

const labels: Record<ScheduleHealth, string> = {
  onTrack: "On schedule",
  atRisk: "At risk of delay",
  delayed: "Delayed",
  notAssessed: "Cannot be assessed",
};
const colors: Record<ScheduleHealth, string> = {
  onTrack: "#16a34a",
  atRisk: "#d97706",
  delayed: "#dc2626",
  notAssessed: "#64748b",
};

export function selectScheduleHealth(callback: (health: ScheduleHealth) => void, health: ScheduleHealth) {
  callback(health);
}

export function ScheduleHealthChart({
  data,
  onSelect,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["scheduleHealth"];
  onSelect?: (health: ScheduleHealth) => void;
  onDrillthrough?: (health: ScheduleHealth) => void;
}) {
  const chartData = data.map((item) => ({ ...item, label: labels[item.key], fill: colors[item.key] }));
  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.count} ${item.label.toLowerCase()} with ${formatDashboardCurrency(item.budget)} allocated`).join("; ")
    : "No project schedule status is available.";
  return (
    <ChartPanel
      title="Are projects on schedule?"
      description="Projects grouped by whether they are on schedule, at risk of delay, already delayed, or cannot be assessed — usually because a project is already completed or is missing a start or target date. Select a status to view its projects."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <div
            role="img"
            aria-label={`Of ${total.toLocaleString("en-PH")} total projects: ${chartData.map((item) => `${item.label} ${item.count.toLocaleString("en-PH")}`).join(", ")}`}
            className="flex h-7 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
          >
            {chartData.map((item) => item.count > 0 ? (
              <div
                key={item.key}
                style={{ width: `${(item.count / Math.max(total, 1)) * 100}%`, backgroundColor: item.fill }}
                title={`${item.label}: ${item.count.toLocaleString("en-PH")} (${((item.count / Math.max(total, 1)) * 100).toFixed(1)}%)`}
              />
            ) : null)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{total.toLocaleString("en-PH")} total projects</p>

          <ul className="mt-4 grid list-none gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
            {chartData.map((item) => {
              const pct = (item.count / Math.max(total, 1)) * 100;
              const row = (
                <>
                  <span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.fill }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {item.count.toLocaleString("en-PH")} projects · {pct.toFixed(1)}% · {formatDashboardCurrency(item.budget)}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={item.key}>
                  {onDrillthrough ? (
                    <button
                      type="button"
                      onClick={() => selectScheduleHealth(onDrillthrough, item.key)}
                      className="flex min-h-11 w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-slate-800/60"
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex items-start gap-2.5 px-2 py-1.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="-mx-5 -mb-5 mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              <span>Chart controls</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {onSelect ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Filter className="size-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                  <span>Apply filter:</span>
                  <select
                    aria-label="Filter dashboard by schedule status"
                    value=""
                    onChange={(event) => event.target.value && selectScheduleHealth(onSelect, event.target.value as ScheduleHealth)}
                    className="h-11 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>Choose a schedule status</option>
                    {chartData.map((item) => <option key={item.key} value={item.key}>{item.label}: {item.count}</option>)}
                  </select>
                </label>
              ) : null}
              {onDrillthrough ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Eye className="size-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                  <span>Open project list:</span>
                  <select
                    aria-label="View projects by schedule status"
                    value=""
                    onChange={(event) => event.target.value && selectScheduleHealth(onDrillthrough, event.target.value as ScheduleHealth)}
                    className="h-11 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>Choose a schedule status</option>
                    {chartData.map((item) => <option key={item.key} value={item.key}>{item.label}: {item.count}</option>)}
                  </select>
                </label>
              ) : null}
            </div>
          </div>
        </>
      )}
    </ChartPanel>
  );
}
