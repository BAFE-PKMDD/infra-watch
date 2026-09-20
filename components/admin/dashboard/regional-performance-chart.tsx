"use client";

import { Eye, Filter, SlidersHorizontal } from "lucide-react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

type RegionalPerformanceRow = ManagerialDashboardData["regions"][number];

export function formatRegionAxisLabel(region: string) {
  const acronym = region.match(/\(([A-Z]{2,})\)$/)?.[1];
  if (acronym) return acronym;
  return region.length > 28 ? `${region.slice(0, 27)}…` : region;
}

export function limitRegionalPerformance(data: RegionalPerformanceRow[], limit = 10) {
  if (limit <= 0) return [];
  const ranked = [...data].sort((a, b) => b.completionRate - a.completionRate || a.region.localeCompare(b.region));
  if (ranked.length <= limit) return ranked;

  const strongestCount = Math.ceil(limit / 2);
  const weakestCount = limit - strongestCount;
  const selected = [
    ...ranked.slice(0, strongestCount),
    ...(weakestCount > 0 ? ranked.slice(-weakestCount) : []),
  ];
  return selected.sort((a, b) => b.completionRate - a.completionRate || a.region.localeCompare(b.region));
}

export function formatRegionalRateTooltip(
  metric: "completionRate" | "delayedRate" | "atRiskRate",
  value: number,
  row: RegionalPerformanceRow,
) {
  if (metric === "completionRate") {
    return `${value.toFixed(1)}% (${row.completed} of ${row.total} total projects)`;
  }
  const count = metric === "delayedRate" ? row.delayed : row.atRisk;
  return `${value.toFixed(1)}% (${count} of ${row.assessed} assessed projects; ${row.assessed} of ${row.total} assessed)`;
}

export function RegionalPerformanceChart({
  data,
  onSelect,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["regions"];
  onSelect?: (region: string) => void;
  onDrillthrough?: (region: string, metric: "completed" | "delayed" | "atRisk") => void;
}) {
  const chartData = limitRegionalPerformance(data);
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.region}: ${item.completionRate.toFixed(1)}% complete, ${item.completed} completed of ${item.total}, ${item.delayed} delayed, ${item.atRisk} at risk`).join("; ") : "No regional performance data available.";
  return (
    <ChartPanel title="Regional performance ranking" description={data.length > chartData.length ? `Strongest and weakest performers shown (${chartData.length} of ${data.length} regions), ranked by completion rate. Delayed and at-risk counts are of that region's assessed (non-completed, schedule-trackable) projects, not of the total. Select a region to view its projects.` : "Ranked by completion rate. Delayed and at-risk counts are of that region's assessed (non-completed, schedule-trackable) projects, not of the total. Select a region to view its projects."} summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <div className="flex items-center gap-3 px-1.5 pb-1.5 text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            <span className="w-20 sm:w-40">Region</span>
            <span className="flex-1">Completion rate</span>
            <span className="w-12 shrink-0 text-right">Rate</span>
            <span className="w-28 shrink-0 text-right">Of assessed</span>
          </div>
          <ul className="list-none space-y-1 p-0" aria-label="Regions ranked by completion rate, with delayed and at-risk counts among assessed projects">
            {chartData.map((item) => {
              const delayedRate = item.assessed > 0 ? (item.delayed / item.assessed) * 100 : 0;
              const atRiskRate = item.assessed > 0 ? (item.atRisk / item.assessed) * 100 : 0;
              const row = (
                <>
                  <span className="w-20 shrink-0 truncate text-sm font-medium text-slate-700 sm:w-40 dark:text-slate-200" title={item.region}>
                    {formatRegionAxisLabel(item.region)}
                  </span>
                  <span className="h-5 flex-1 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">
                    <span
                      className="block h-full rounded-sm"
                      style={{ width: `${Math.min(100, Math.max(0, item.completionRate))}%`, backgroundColor: "#16a34a" }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                    {item.completionRate.toFixed(1)}%
                  </span>
                  <span className="flex w-28 shrink-0 flex-wrap items-center justify-end gap-1">
                    {item.delayed > 0 && (
                      <span
                        title={formatRegionalRateTooltip("delayedRate", delayedRate, item)}
                        className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      >
                        {item.delayed} delayed
                      </span>
                    )}
                    {item.atRisk > 0 && (
                      <span
                        title={formatRegionalRateTooltip("atRiskRate", atRiskRate, item)}
                        className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      >
                        {item.atRisk} at risk
                      </span>
                    )}
                    {item.delayed === 0 && item.atRisk === 0 && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.assessed > 0 ? "None flagged" : "Not assessed"}
                      </span>
                    )}
                  </span>
                  <span className="sr-only">
                    {`, ${item.completed} of ${item.total} projects completed; ${item.delayed} of ${item.assessed} assessed projects delayed; ${item.atRisk} of ${item.assessed} assessed at risk.`}
                  </span>
                </>
              );
              return (
                <li key={item.region}>
                  {onDrillthrough ? (
                    <button
                      type="button"
                      onClick={() => onDrillthrough(item.region, "completed")}
                      className="flex min-h-11 w-full items-center gap-3 rounded-md px-1.5 py-1 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-slate-800/60"
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-1.5 py-1">{row}</div>
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
                    aria-label="Filter dashboard by region"
                    value=""
                    onChange={(event) => event.target.value && onSelect(event.target.value)}
                    className="h-11 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>Choose a region</option>
                    {chartData.map((item) => <option key={item.region} value={item.region}>{item.region}: {item.completionRate.toFixed(1)}%</option>)}
                  </select>
                </label>
              ) : null}
              {onDrillthrough ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Eye className="size-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                  <span>Open project list:</span>
                  <select
                    aria-label="View projects represented by a regional value"
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const [metric, region] = event.target.value.split("::", 2) as ["completed" | "delayed" | "atRisk", string];
                      onDrillthrough(region, metric);
                    }}
                    className="h-11 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>Choose a region and value</option>
                    {chartData.map((item) => (
                      <optgroup key={item.region} label={item.region}>
                        <option value={`completed::${item.region}`}>Completed: {item.completed}</option>
                        <option value={`delayed::${item.region}`}>Delayed: {item.delayed}</option>
                        <option value={`atRisk::${item.region}`}>At risk of delay: {item.atRisk}</option>
                      </optgroup>
                    ))}
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
