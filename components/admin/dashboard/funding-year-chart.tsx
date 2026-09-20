"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Filter, SlidersHorizontal } from "lucide-react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

export function FundingYearChart({
  data,
  onSelect,
}: {
  data: ManagerialDashboardData["fundingYears"];
  onSelect?: (yearFunded: string) => void;
}) {
  const chartData = data.filter((item) => item.yearFunded !== "Unknown");
  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.yearFunded}: ${item.completionRate.toFixed(1)}% complete, ${item.delayed} delayed`).join("; ")
    : "No funding-year data is available.";

  return (
    <ChartPanel
      title="Are older funding years catching up?"
      description="Completion rate by funding year, across projects with a known year in the current scope. A low rate on an old year means projects funded long ago are still incomplete."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ completionRate: { label: "Completion rate", color: "#0f766e" } }} className="h-60 w-full aspect-auto" role="img" aria-label="Completion rate by funding year">
            <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="yearFunded" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="grid gap-0.5">
                        <span>{Number(value).toFixed(1)}% completed</span>
                        <span>{item.payload?.completed?.toLocaleString("en-PH")} of {item.payload?.total?.toLocaleString("en-PH")} projects</span>
                        <span>{item.payload?.delayed?.toLocaleString("en-PH")} delayed &middot; {formatDashboardCurrency(Number(item.payload?.allocatedBudget ?? 0))} allocated</span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="completionRate"
                fill="#0f766e"
                radius={[5, 5, 0, 0]}
                className={onSelect ? "cursor-pointer" : undefined}
                onClick={onSelect ? (entry) => onSelect((entry.payload as { yearFunded: string }).yearFunded) : undefined}
              />
            </BarChart>
          </ChartContainer>
          {onSelect && (
            <div className="-mx-5 -mb-5 mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                <span>Chart controls</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Filter className="size-4 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                <span>Apply filter:</span>
                <select
                  aria-label="Filter dashboard by funding year"
                  value=""
                  onChange={(event) => event.target.value && onSelect(event.target.value)}
                  className="h-11 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="" disabled>Choose a funding year</option>
                  {chartData.map((item) => <option key={item.yearFunded} value={item.yearFunded}>{item.yearFunded}: {item.completionRate.toFixed(0)}% complete</option>)}
                </select>
              </label>
            </div>
          )}
        </>
      )}
    </ChartPanel>
  );
}
