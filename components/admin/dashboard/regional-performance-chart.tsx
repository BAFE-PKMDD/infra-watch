"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Eye, Filter, SlidersHorizontal } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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

export function RegionalPerformanceChart({
  data,
  onSelect,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["regions"];
  onSelect?: (region: string) => void;
  onDrillthrough?: (region: string, metric: "completed" | "delayed" | "atRisk") => void;
}) {
  const chartData = limitRegionalPerformance(data).map((item) => ({
    ...item,
    delayedRate: item.assessed > 0 ? (item.delayed / item.assessed) * 100 : 0,
    atRiskRate: item.assessed > 0 ? (item.atRisk / item.assessed) * 100 : 0,
  }));
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.region}: ${item.completionRate.toFixed(1)}% complete, ${item.completed} completed of ${item.total}, ${item.delayed} delayed, ${item.atRisk} at risk`).join("; ") : "No regional performance data available.";
  return (
    <ChartPanel title="Regional performance ranking" description={data.length > chartData.length ? `Strongest and weakest performers shown (${chartData.length} of ${data.length} regions). Select a bar to view its projects.` : "Completion, delayed, and at-risk rates with project counts for context. Select a bar to view its projects."} summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ completionRate: { label: "Completion", color: "#16a34a" }, delayedRate: { label: "Delayed", color: "#dc2626" }, atRiskRate: { label: "At risk", color: "#d97706" } }} className="w-full aspect-auto" style={{ height: Math.max(320, chartData.length * 38) }} role="img" aria-label="Regional completion, delayed, and at-risk rates">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="region" width={190} tickFormatter={formatRegionAxisLabel} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => <span>{Number(value).toFixed(1)}% ({String(name) === "completionRate" ? item.payload?.completed : String(name) === "delayedRate" ? item.payload?.delayed : item.payload?.atRisk} of {item.payload?.total})</span>} />} />
              <Legend />
              <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={[0, 4, 4, 0]} className={onDrillthrough ? "cursor-pointer" : undefined} onClick={onDrillthrough ? (entry) => onDrillthrough(String(entry.payload?.region ?? ""), "completed") : undefined} />
              <Bar dataKey="delayedRate" fill="var(--color-delayedRate)" radius={[0, 4, 4, 0]} className={onDrillthrough ? "cursor-pointer" : undefined} onClick={onDrillthrough ? (entry) => onDrillthrough(String(entry.payload?.region ?? ""), "delayed") : undefined} />
              <Bar dataKey="atRiskRate" fill="var(--color-atRiskRate)" radius={[0, 4, 4, 0]} className={onDrillthrough ? "cursor-pointer" : undefined} onClick={onDrillthrough ? (entry) => onDrillthrough(String(entry.payload?.region ?? ""), "atRisk") : undefined} />
            </BarChart>
          </ChartContainer>
          <div className="-mx-4 -mb-4 mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              <span>Actions</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {onSelect ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Filter className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>Filter:</span>
                  <select
                    aria-label="Filter dashboard by region"
                    value=""
                    onChange={(event) => event.target.value && onSelect(event.target.value)}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="" disabled>Choose a region</option>
                    {chartData.map((item) => <option key={item.region} value={item.region}>{item.region} — {item.completionRate.toFixed(1)}%</option>)}
                  </select>
                </label>
              ) : null}
              {onDrillthrough ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Eye className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>View Details:</span>
                  <select
                    aria-label="View projects represented by a regional value"
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const [metric, region] = event.target.value.split("::", 2) as ["completed" | "delayed" | "atRisk", string];
                      onDrillthrough(region, metric);
                    }}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="" disabled>Choose a region and value</option>
                    {chartData.map((item) => (
                      <optgroup key={item.region} label={item.region}>
                        <option value={`completed::${item.region}`}>Completed: {item.completed}</option>
                        <option value={`delayed::${item.region}`}>Delayed: {item.delayed}</option>
                        <option value={`atRisk::${item.region}`}>At risk: {item.atRisk}</option>
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
