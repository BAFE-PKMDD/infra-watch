"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Eye, Filter, SlidersHorizontal } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatRegionAxisLabel } from "./regional-performance-chart";

type RegionRow = ManagerialDashboardData["regions"][number];

export function rankDelayedRegions(data: RegionRow[], limit = 8) {
  return data
    .filter((item) => item.delayed > 0)
    .sort((left, right) => right.delayed - left.delayed || left.region.localeCompare(right.region, "en-PH"))
    .slice(0, limit);
}

export function DelayedProjectsByRegionChart({
  data,
  onSelect,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["regions"];
  onSelect?: (region: string) => void;
  onDrillthrough?: (region: string) => void;
}) {
  const chartData = rankDelayedRegions(data);
  const assessedProjects = data.reduce((total, item) => total + item.assessed, 0);
  const totalProjects = data.reduce((total, item) => total + item.total, 0);
  const allProjectsAssessed = totalProjects > 0 && assessedProjects === totalProjects;
  const coverageSummary = `${assessedProjects.toLocaleString("en-PH")} of ${totalProjects.toLocaleString("en-PH")} projects assessed`;
  const summary = chartData.length > 0
    ? `${chartData.map((item) => `${item.region}: ${item.delayed.toLocaleString("en-PH")} delayed projects`).join("; ")}. ${coverageSummary}.`
    : assessedProjects === 0
      ? "Delayed projects cannot be assessed because schedule data is unavailable."
      : allProjectsAssessed
        ? "No delayed projects are identified for the current filters."
        : `No confirmed delayed projects among ${coverageSummary}.`;

  return (
    <ChartPanel
      title="Delayed Projects by Region"
      description={`Confirmed delayed projects by region. ${coverageSummary}. Select a bar to view its projects.`}
      summary={summary}
    >
      {chartData.length === 0 ? (
        <ChartEmptyState
          title={assessedProjects === 0
            ? "Delayed-project data unavailable."
            : allProjectsAssessed
              ? "No delayed projects for the current filters."
              : "No confirmed regional delays."}
          detail={assessedProjects === 0
            ? "No projects in the current scope have sufficient schedule data for regional delay assessment."
            : allProjectsAssessed
              ? "All schedule-assessed projects in the current scope have no confirmed delay."
              : `Based on ${coverageSummary}; unassessed projects are not represented as on track.`}
        />
      ) : (
        <>
          <ChartContainer
            config={{ delayed: { label: "Delayed projects", color: "#dc2626" } }}
            className="w-full aspect-auto"
            style={{ height: Math.max(260, chartData.length * 38) }}
            role="img"
            aria-label="Delayed project counts by region"
          >
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} label={{ value: "Projects", position: "insideBottom", offset: -4, fontSize: 11 }} />
              <YAxis type="category" dataKey="region" width={175} tickFormatter={formatRegionAxisLabel} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value, _name, item) => (
                  <div className="grid gap-0.5">
                    <span>{Number(value).toLocaleString("en-PH")} delayed projects</span>
                    <span>{Number(item.payload?.assessed ?? 0).toLocaleString("en-PH")} schedule-assessed</span>
                  </div>
                )} />}
              />
              <Bar
                dataKey="delayed"
                fill="var(--color-delayed)"
                radius={[0, 4, 4, 0]}
                className={onDrillthrough ? "cursor-pointer" : undefined}
                onClick={onDrillthrough ? (entry) => onDrillthrough(String(entry.payload?.region ?? "")) : undefined}
              />
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
                    {chartData.map((item) => <option key={item.region} value={item.region}>{item.region}</option>)}
                  </select>
                </label>
              ) : null}
              {onDrillthrough ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Eye className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>View Details:</span>
                  <select
                    aria-label="View delayed projects by region"
                    value=""
                    onChange={(event) => event.target.value && onDrillthrough(event.target.value)}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="" disabled>Choose a region</option>
                    {chartData.map((item) => <option key={item.region} value={item.region}>{item.region}: {item.delayed}</option>)}
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
