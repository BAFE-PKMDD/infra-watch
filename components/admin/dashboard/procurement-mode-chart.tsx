"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCompactCurrency, formatDashboardCurrency } from "./executive-kpis";

export function ProcurementModeChart({ data }: { data: ManagerialDashboardData["procurementModes"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Budget by way of buying"
        description="How projects were procured."
        summary="Procurement-mode data is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Procurement-mode data is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const chartData = data.filter((item) => item.mode !== "Unknown" && item.allocatedBudget > 0);
  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.mode}: ${formatDashboardCurrency(item.allocatedBudget)} across ${item.total} projects`).join("; ")
    : "No procurement-mode data is available.";

  return (
    <ChartPanel
      title="Budget by way of buying"
      description="Allocated budget by procurement mode, for projects where this is recorded."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer config={{ allocatedBudget: { label: "Allocated budget", color: "var(--a-s3, var(--primary))" } }} className="h-60 w-full aspect-auto" role="img" aria-label="Allocated budget by procurement mode">
          <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => formatDashboardCompactCurrency(Number(value))} />
            <YAxis type="category" dataKey="mode" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
              <span>{formatDashboardCurrency(Number(value))} across {item.payload?.total} projects</span>
            )} />} />
            <Bar dataKey="allocatedBudget" fill="var(--color-allocatedBudget)" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
