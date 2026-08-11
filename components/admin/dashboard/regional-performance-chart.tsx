"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

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

export function RegionalPerformanceChart({ data, onSelect }: { data: ManagerialDashboardData["regions"]; onSelect: (region: string) => void }) {
  const chartData = limitRegionalPerformance(data).map((item) => ({
    ...item,
    delayedRate: item.assessed > 0 ? (item.delayed / item.assessed) * 100 : 0,
    atRiskRate: item.assessed > 0 ? (item.atRisk / item.assessed) * 100 : 0,
  }));
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.region}: ${item.completionRate.toFixed(1)}% complete, ${item.completed} completed of ${item.total}, ${item.delayed} delayed, ${item.atRisk} at risk`).join("; ") : "No regional performance data available.";
  return (
    <ChartPanel title="Regional performance ranking" description={data.length > chartData.length ? `Strongest and weakest performers shown (${chartData.length} of ${data.length} regions). Select a region to filter the dashboard.` : "Completion, delayed, and at-risk rates with project counts for context."} summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ completionRate: { label: "Completion", color: "#16a34a" }, delayedRate: { label: "Delayed", color: "#dc2626" }, atRiskRate: { label: "At risk", color: "#d97706" } }} className="w-full aspect-auto" style={{ height: Math.max(320, chartData.length * 38) }} role="img" aria-label="Regional completion, delayed, and at-risk rates">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="region" width={190} tickFormatter={formatRegionAxisLabel} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => <span>{Number(value).toFixed(1)}% ({String(name) === "completionRate" ? item.payload?.completed : String(name) === "delayedRate" ? item.payload?.delayed : item.payload?.atRisk} of {item.payload?.total})</span>} />} />
              <Legend />
              <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={[0, 4, 4, 0]} onClick={(entry) => onSelect(String(entry.payload?.region ?? ""))} />
              <Bar dataKey="delayedRate" fill="var(--color-delayedRate)" radius={[0, 4, 4, 0]} onClick={(entry) => onSelect(String(entry.payload?.region ?? ""))} />
              <Bar dataKey="atRiskRate" fill="var(--color-atRiskRate)" radius={[0, 4, 4, 0]} onClick={(entry) => onSelect(String(entry.payload?.region ?? ""))} />
            </BarChart>
          </ChartContainer>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Filter by region">
            {chartData.map((item) => <button key={item.region} type="button" data-filter-value={item.region} onClick={() => onSelect(item.region)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-700 dark:text-slate-200"><span className="min-w-0 truncate font-bold">{item.region}</span><span className="shrink-0 tabular-nums">{item.completionRate.toFixed(1)}% · {item.completed}/{item.total}</span></button>)}
          </div>
        </>
      )}
    </ChartPanel>
  );
}
