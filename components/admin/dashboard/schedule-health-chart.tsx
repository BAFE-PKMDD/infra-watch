"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Eye, Filter, SlidersHorizontal } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.count} ${item.label.toLowerCase()} with ${formatDashboardCurrency(item.budget)} allocated`).join("; ")
    : "No project schedule status is available.";
  return (
    <ChartPanel
      title="Are projects on schedule?"
      description="Projects grouped by whether they are on schedule, at risk of delay, already delayed, or cannot be assessed. Select a bar to view its projects."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ count: { label: "Projects", color: "#0f766e" } }} className="h-60 w-full aspect-auto" role="img" aria-label="Project counts by schedule status">
            <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => <div className="grid gap-0.5"><span>{Number(value).toLocaleString("en-PH")} projects</span><span>{formatDashboardCurrency(Number(item.payload?.budget ?? 0))} allocated</span></div>} />} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} className={onDrillthrough ? "cursor-pointer" : undefined} onClick={onDrillthrough ? (entry) => selectScheduleHealth(onDrillthrough, (entry as { key: ScheduleHealth }).key) : undefined} />
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
                    aria-label="Filter dashboard by schedule status"
                    value=""
                    onChange={(event) => event.target.value && selectScheduleHealth(onSelect, event.target.value as ScheduleHealth)}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="" disabled>Choose a schedule status</option>
                    {chartData.map((item) => <option key={item.key} value={item.key}>{item.label}: {item.count}</option>)}
                  </select>
                </label>
              ) : null}
              {onDrillthrough ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Eye className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>View Details:</span>
                  <select
                    aria-label="View projects by schedule status"
                    value=""
                    onChange={(event) => event.target.value && selectScheduleHealth(onDrillthrough, event.target.value as ScheduleHealth)}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
