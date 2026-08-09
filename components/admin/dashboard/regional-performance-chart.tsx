"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

export function RegionalPerformanceChart({ data, onSelect }: { data: ManagerialDashboardData["regions"]; onSelect: (region: string) => void }) {
  const chartData = data.map((item) => ({
    ...item,
    delayedRate: item.assessed > 0 ? (item.delayed / item.assessed) * 100 : 0,
    atRiskRate: item.assessed > 0 ? (item.atRisk / item.assessed) * 100 : 0,
  }));
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.region}: ${item.completionRate.toFixed(1)}% complete, ${item.completed} completed of ${item.total}, ${item.delayed} delayed, ${item.atRisk} at risk`).join("; ") : "No regional performance data available.";
  return (
    <ChartPanel title="Regional performance ranking" description="Completion, delayed, and at-risk rates with project counts for context." summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ completionRate: { label: "Completion", color: "#16a34a" }, delayedRate: { label: "Delayed", color: "#dc2626" }, atRiskRate: { label: "At risk", color: "#d97706" } }} className="h-72 w-full aspect-auto" aria-label="Regional completion, delayed, and at-risk rates">
            <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="region" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => <span>{Number(value).toFixed(1)}% ({String(name) === "completionRate" ? item.payload?.completed : String(name) === "delayedRate" ? item.payload?.delayed : item.payload?.atRisk} of {item.payload?.total})</span>} />} />
              <Legend />
              <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={[4, 4, 0, 0]} onClick={(entry) => onSelect(String(entry.payload?.region ?? ""))} />
              <Bar dataKey="delayedRate" fill="var(--color-delayedRate)" radius={[4, 4, 0, 0]} onClick={(entry) => onSelect(String(entry.payload?.region ?? ""))} />
              <Bar dataKey="atRiskRate" fill="var(--color-atRiskRate)" radius={[4, 4, 0, 0]} onClick={(entry) => onSelect(String(entry.payload?.region ?? ""))} />
            </BarChart>
          </ChartContainer>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter by region">
            {chartData.map((item) => <button key={item.region} type="button" data-filter-value={item.region} onClick={() => onSelect(item.region)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">{item.region}: {item.completed} completed of {item.total}</button>)}
          </div>
        </>
      )}
    </ChartPanel>
  );
}
