"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

export function LateRateByYearChart({ data }: { data: ManagerialDashboardData["lateRateByYear"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Late projects, by budget year"
        description="Of projects funded in a given year, how many finished late."
        summary="Late-rate-by-year data is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Late-rate-by-year data is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const chartData = data
    .filter((row) => row.yearFunded !== "Unknown" && row.total > 0)
    .map((row) => ({ yearFunded: row.yearFunded, lateOf100: Math.round((row.lateCount / row.total) * 100), lateCount: row.lateCount, total: row.total }));

  const summary = chartData.length > 0
    ? chartData.map((row) => `Funded ${row.yearFunded}: ${row.lateOf100} of 100 late`).join("; ")
    : "No completed projects with both dates and a known funding year.";

  return (
    <ChartPanel
      title="Late projects, by budget year"
      description="Out of 100 projects funded each year, how many finished late. Recent years may still rise, since some late projects haven't finished yet."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer config={{ lateOf100: { label: "Late per 100 projects", color: "var(--a-serious, #f97316)" } }} className="h-60 w-full aspect-auto" role="img" aria-label="Late rate by funding year">
          <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="yearFunded" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
              <span>{Number(value)} of 100 late · {item.payload?.lateCount} of {item.payload?.total} projects</span>
            )} />} />
            <Bar dataKey="lateOf100" fill="var(--color-lateOf100)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
