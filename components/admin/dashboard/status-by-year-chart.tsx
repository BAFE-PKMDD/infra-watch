"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData, ProjectStatusFilter } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { PROJECT_STATUS_LABELS as STATUS_LABELS } from "./dashboard-filters";
import { formatDashboardCurrency } from "./executive-kpis";

type Measure = "counts" | "allocatedBudget";

const STATUS_COLORS: Record<ProjectStatusFilter, string> = {
  planned: "var(--a-s2, #5598e7)",
  ongoing: "var(--a-s4, #1c5cab)",
  completed: "var(--a-good, #16a34a)",
  suspended: "var(--a-crit, #dc2626)",
};

const STATUS_ORDER: ProjectStatusFilter[] = ["planned", "ongoing", "completed", "suspended"];

export function StatusByYearChart({ data }: { data: ManagerialDashboardData["statusByYear"] }) {
  const [measure, setMeasure] = useState<Measure>("counts");

  if (!data) {
    return (
      <ChartPanel
        title="How is the portfolio's status mix shifting by funding year?"
        description="Each funding year's projects broken out by status: planned, ongoing, completed, or suspended."
        summary="Status by funding year is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Status by funding year is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const chartData: Array<Record<ProjectStatusFilter, number> & { yearFunded: string; total: number }> = data
    .filter((item) => item.yearFunded !== "Unknown")
    .map((item) => ({
      yearFunded: item.yearFunded,
      total: STATUS_ORDER.reduce((sum, status) => sum + item.counts[status], 0),
      ...item[measure],
    }));

  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.yearFunded}: ${STATUS_ORDER.map((status) => `${item[status]} ${STATUS_LABELS[status].toLowerCase()}`).join(", ")}`).join("; ")
    : "No funding-year status data is available.";

  return (
    <ChartPanel
      title="How is the portfolio's status mix shifting by funding year?"
      description="Each funding year's projects broken out by status: planned, ongoing, completed, or suspended. A recent year still dominated by planned or ongoing projects hasn't had time to complete; an old year still showing the same is a signal worth checking."
      summary={summary}
      headerAction={
        <div role="group" aria-label="Measure" className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
          {(["counts", "allocatedBudget"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={measure === option}
              onClick={() => setMeasure(option)}
              className={`min-h-11 rounded px-3 text-sm font-medium transition-colors ${
                measure === option
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {option === "counts" ? "Projects" : "Budget"}
            </button>
          ))}
        </div>
      }
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer
          config={Object.fromEntries(STATUS_ORDER.map((status) => [status, { label: STATUS_LABELS[status], color: STATUS_COLORS[status] }]))}
          className="h-64 w-full aspect-auto"
          role="img"
          aria-label="Project status by funding year"
        >
          <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="yearFunded" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => measure === "allocatedBudget" ? formatDashboardCurrency(Number(value)) : Number(value).toLocaleString("en-PH")}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span>
                      {STATUS_LABELS[name as ProjectStatusFilter] ?? String(name)}: {measure === "allocatedBudget" ? formatDashboardCurrency(Number(value)) : Number(value).toLocaleString("en-PH")}
                    </span>
                  )}
                />
              }
            />
            <Legend formatter={(value) => STATUS_LABELS[value as ProjectStatusFilter] ?? value} />
            {STATUS_ORDER.map((status, index) => (
              <Bar
                key={status}
                dataKey={status}
                name={status}
                stackId="status"
                fill={STATUS_COLORS[status]}
                radius={index === STATUS_ORDER.length - 1 ? [5, 5, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
