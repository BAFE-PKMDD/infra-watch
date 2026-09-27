"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useState } from "react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { formatRegionAxisLabel } from "./regional-performance-chart";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCompactCurrency, formatDashboardCurrency } from "./executive-kpis";

type Measure = "allocatedBudget" | "total";
type RegionRow = ManagerialDashboardData["regions"][number];

export function RegionTotalsChart({ data }: { data: ManagerialDashboardData["regions"] }) {
  const [measure, setMeasure] = useState<Measure>("total");

  const ranked = [...data].sort((a, b) => b[measure] - a[measure] || a.region.localeCompare(b.region));
  const chartData = ranked.map((row: RegionRow) => ({
    key: row.region,
    label: formatRegionAxisLabel(row.region),
    total: row.total,
    allocatedBudget: row.allocatedBudget,
  }));
  const measureNoun = measure === "allocatedBudget" ? "Allocated budget" : "Project count";

  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.label}: ${item.total.toLocaleString("en-PH")} projects, ${formatDashboardCurrency(item.allocatedBudget)}`).join("; ")
    : "No regional totals are available.";

  return (
    <ChartPanel
      title="How are projects and budget spread across regions?"
      description="Every region in the current scope, ranked by project count or allocated budget."
      summary={summary}
      headerAction={
        <div role="group" aria-label="Measure" className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
          {(["total", "allocatedBudget"] as const).map((option) => (
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
              {option === "total" ? "Projects" : "Budget"}
            </button>
          ))}
        </div>
      }
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer
          config={{ [measure]: { label: measureNoun, color: "var(--a-s3, var(--primary))" } }}
          className="w-full aspect-auto"
          style={{ height: Math.max(chartData.length * 28, 200) }}
          role="img"
          aria-label={`${measureNoun} by region`}
        >
          <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => measure === "allocatedBudget" ? formatDashboardCompactCurrency(Number(value)) : Number(value).toLocaleString("en-PH")} />
            <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => measure === "allocatedBudget" ? formatDashboardCurrency(Number(value)) : `${Number(value).toLocaleString("en-PH")} projects`} />} />
            <Bar dataKey={measure} fill={`var(--color-${measure})`} radius={[0, 5, 5, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
