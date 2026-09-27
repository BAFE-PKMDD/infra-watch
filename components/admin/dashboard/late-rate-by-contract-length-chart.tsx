"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ContractLengthBucket, ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

const BUCKET_LABELS: Record<ContractLengthBucket, string> = {
  "30orLess": "30 days or less",
  "31to60": "31-60 days",
  "61to90": "61-90 days",
  "91to180": "91-180 days",
  over180: "More than 180 days",
};

export function LateRateByContractLengthChart({ data }: { data: ManagerialDashboardData["lateRateByContractLength"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Short contracts are late more often"
        description="Of projects with a given contract length, how many finished late."
        summary="Contract-length data is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Contract-length data is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const chartData = data
    .filter((row) => row.total > 0)
    .map((row) => ({ bucket: row.bucket, label: BUCKET_LABELS[row.bucket], lateOf100: Math.round((row.lateCount / row.total) * 100), lateCount: row.lateCount, total: row.total }));

  const summary = chartData.length > 0
    ? chartData.map((row) => `${row.label}: ${row.lateOf100} of 100 late`).join("; ")
    : "No completed projects with a recorded contract length and both dates.";

  return (
    <ChartPanel
      title="Short contracts are late more often"
      description="Out of 100 projects with a given contract length (calendar days allowed), how many finished late."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer config={{ lateOf100: { label: "Late per 100 projects", color: "var(--a-serious, #f97316)" } }} className="h-60 w-full aspect-auto" role="img" aria-label="Late rate by contract length">
          <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 40 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}`} />
            <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
              <span>{Number(value)} of 100 late · {item.payload?.lateCount} of {item.payload?.total} projects</span>
            )} />} />
            <Bar dataKey="lateOf100" fill="var(--color-lateOf100)" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
