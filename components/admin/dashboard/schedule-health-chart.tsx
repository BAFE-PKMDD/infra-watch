"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData, ScheduleHealth } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

const labels: Record<ScheduleHealth, string> = {
  onTrack: "On track",
  atRisk: "At risk",
  delayed: "Delayed",
  notAssessed: "Not assessed",
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

export function ScheduleHealthChart({ data, onSelect }: { data: ManagerialDashboardData["scheduleHealth"]; onSelect?: (health: ScheduleHealth) => void }) {
  const chartData = data.map((item) => ({ ...item, label: labels[item.key], fill: colors[item.key] }));
  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.count} ${item.label.toLowerCase()} with ${formatDashboardCurrency(item.budget)} allocated`).join("; ")
    : "No schedule-health data available.";
  return (
    <ChartPanel title="Schedule health distribution" description="Rules-based current schedule outlook and allocated budget exposure." summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ count: { label: "Projects", color: "#0f766e" } }} className="h-60 w-full aspect-auto" role="img" aria-label="Schedule health project counts">
            <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => <div className="grid gap-0.5"><span>{Number(value).toLocaleString("en-PH")} projects</span><span>{formatDashboardCurrency(Number(item.payload?.budget ?? 0))} allocated</span></div>} />} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} onClick={onSelect ? (entry) => selectScheduleHealth(onSelect, (entry as { key: ScheduleHealth }).key) : undefined} />
            </BarChart>
          </ChartContainer>
          {onSelect ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter by schedule health">
            {chartData.map((item) => (
              <button key={item.key} type="button" data-filter-value={item.key} onClick={() => selectScheduleHealth(onSelect, item.key)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">
                {item.label}: {item.count}
              </button>
            ))}
          </div> : null}
        </>
      )}
    </ChartPanel>
  );
}
