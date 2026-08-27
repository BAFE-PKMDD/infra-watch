"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Eye, Filter, SlidersHorizontal } from "lucide-react";

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

export function ProjectTypeBudgetChart({
  data,
  onSelect,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["projectTypes"];
  onSelect: (projectType: string) => void;
  onDrillthrough?: (projectType: string, excludedProjectTypes?: string[]) => void;
}) {
  const chartData = limitProjectTypes(data);
  const namedProjectTypes = chartData
    .filter((item) => item.projectType !== "Other" && item.projectType !== "Unknown")
    .map((item) => item.projectType);
  const openProjectType = (projectType: string) => onDrillthrough?.(
    projectType,
    projectType === "Other" ? namedProjectTypes : undefined,
  );
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.projectType}: ${formatDashboardCurrency(item.allocatedBudget)} across ${item.total} projects`).join("; ") : "No project-type budget data available.";
  return (
    <ChartPanel title="Budget Allocation by Project Type" description="Allocated budget ranked by project type. Select any bar to view its projects; smaller categories are combined as Other." summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ allocatedBudget: { label: "Allocated budget", color: "#0f766e" } }} className="h-80 w-full aspect-auto" role="img" aria-label="Allocated budget by project type">
            <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatDashboardCompactCurrency(Number(value))} />
              <YAxis type="category" dataKey="projectType" width={150} tickFormatter={formatProjectTypeAxisLabel} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatDashboardCurrency(Number(value))} />} />
              <Bar dataKey="allocatedBudget" fill="var(--color-allocatedBudget)" radius={[0, 5, 5, 0]} className={onDrillthrough ? "cursor-pointer" : undefined} onClick={onDrillthrough ? (entry) => openProjectType((entry.payload as ProjectTypeRow).projectType) : undefined} />
            </BarChart>
          </ChartContainer>
          <div className="-mx-4 -mb-4 mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              <span>Actions</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Filter className="size-3.5 text-slate-400" aria-hidden="true" />
                <span>Filter:</span>
                <select
                  aria-label="Filter dashboard by project type"
                  value=""
                  onChange={(event) => event.target.value && selectProjectType(onSelect, event.target.value)}
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="" disabled>Choose a project type</option>
                  {chartData.map((item) => item.projectType === "Other" ? null : <option key={item.projectType} value={item.projectType}>{item.projectType}</option>)}
                </select>
              </label>
              {onDrillthrough ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Eye className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>View Details:</span>
                  <select
                    aria-label="View projects by project type"
                    value=""
                    onChange={(event) => event.target.value && openProjectType(event.target.value)}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="" disabled>Choose a project type</option>
                    {chartData.map((item) => <option key={item.projectType} value={item.projectType}>{item.projectType}: {item.total}</option>)}
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
