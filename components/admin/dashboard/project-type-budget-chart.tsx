"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCompactCurrency, formatDashboardCurrency } from "./executive-kpis";

type ProjectTypeRow = ManagerialDashboardData["projectTypes"][number];

export function formatProjectTypeAxisLabel(projectType: string) {
  return projectType.length > 24 ? `${projectType.slice(0, 23)}…` : projectType;
}

export function selectProjectType(onSelect: (projectType: string) => void, projectType: string) {
  if (projectType !== "Other") onSelect(projectType);
}

export function limitProjectTypes(data: ProjectTypeRow[], limit = 8): ProjectTypeRow[] {
  if (data.length <= limit) return data;
  const unknown = data.find((item) => item.projectType === "Unknown");
  const ranked = data.filter((item) => item.projectType !== "Unknown").sort((a, b) => b.allocatedBudget - a.allocatedBudget);
  const reserved = unknown ? 2 : 1;
  const kept = ranked.slice(0, Math.max(limit - reserved, 0));
  const remainder = ranked.slice(kept.length);
  const other = remainder.reduce<ProjectTypeRow>((total, item) => ({
    projectType: "Other",
    total: total.total + item.total,
    allocatedBudget: total.allocatedBudget + item.allocatedBudget,
    delayed: total.delayed + item.delayed,
  }), { projectType: "Other", total: 0, allocatedBudget: 0, delayed: 0 });
  return [...kept, ...(other.total > 0 ? [other] : []), ...(unknown ? [unknown] : [])];
}

export function ProjectTypeBudgetChart({ data, onSelect }: { data: ManagerialDashboardData["projectTypes"]; onSelect: (projectType: string) => void }) {
  const chartData = limitProjectTypes(data);
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.projectType}: ${formatDashboardCurrency(item.allocatedBudget)} across ${item.total} projects`).join("; ") : "No project-type budget data available.";
  return (
    <ChartPanel title="Budget allocation by project type" description="Ranked allocated budget; long tails are combined as Other without changing totals." summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ allocatedBudget: { label: "Allocated budget", color: "#0f766e" } }} className="h-80 w-full aspect-auto" role="img" aria-label="Allocated budget by project type">
            <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatDashboardCompactCurrency(Number(value))} />
              <YAxis type="category" dataKey="projectType" width={150} tickFormatter={formatProjectTypeAxisLabel} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatDashboardCurrency(Number(value))} />} />
              <Bar dataKey="allocatedBudget" fill="var(--color-allocatedBudget)" radius={[0, 5, 5, 0]} onClick={(entry) => selectProjectType(onSelect, (entry.payload as ProjectTypeRow).projectType)} />
            </BarChart>
          </ChartContainer>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter by project type">
            {chartData.filter((item) => item.projectType !== "Other").map((item) => <button key={item.projectType} type="button" data-filter-value={item.projectType} onClick={() => selectProjectType(onSelect, item.projectType)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">{item.projectType}</button>)}
          </div>
        </>
      )}
    </ChartPanel>
  );
}
