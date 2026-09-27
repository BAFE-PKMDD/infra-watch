"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData, OverdueBucket } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

const BUCKET_LABELS: Record<OverdueBucket, string> = {
  notYetDue: "Not yet due",
  under6mo: "Under 6 months",
  "6to12mo": "6-12 months",
  "1to2yr": "1-2 years",
  over2yr: "Over 2 years",
  noDates: "No dates",
};

const SERIES_CONFIG = {
  zeroProgress: { label: "Still at 0% progress", color: "var(--a-crit, #dc2626)" },
  someProgress: { label: "Some progress reported", color: "var(--a-s3, #2563eb)" },
};

export function OngoingOverdueBucketsChart({ data }: { data: ManagerialDashboardData["ongoingOverdueBuckets"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="How far past the deadline are ongoing projects?"
        description="Ongoing projects grouped by how far past the target completion date they are."
        summary="This breakdown is not available for this dashboard response."
      >
        <ChartEmptyState title="This breakdown is unavailable" detail="Refresh the dashboard to try again." />
      </ChartPanel>
    );
  }

  const chartData = data.map((row) => ({ bucket: row.bucket, label: BUCKET_LABELS[row.bucket], zeroProgress: row.zeroProgress, someProgress: row.someProgress }));
  const total = chartData.reduce((sum, row) => sum + row.zeroProgress + row.someProgress, 0);
  const summary = total > 0
    ? chartData.map((row) => `${row.label}: ${row.zeroProgress} still at 0%, ${row.someProgress} with some progress`).join("; ")
    : "No ongoing projects are in scope.";

  return (
    <ChartPanel
      title="How far past the deadline are ongoing projects?"
      description="Deadline = target completion date, compared with today. &quot;No dates&quot; means the start date or target date is missing."
      summary={summary}
    >
      {total === 0 ? <ChartEmptyState /> : (
        <ChartContainer config={SERIES_CONFIG} className="h-60 w-full aspect-auto" role="img" aria-label="Ongoing projects by how far past the deadline they are">
          <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="zeroProgress" name="zeroProgress" stackId="overdue" fill="var(--color-zeroProgress)" />
            <Bar dataKey="someProgress" name="someProgress" stackId="overdue" fill="var(--color-someProgress)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}

export function OngoingByYearChart({ data }: { data: ManagerialDashboardData["ongoingByYear"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Ongoing projects, by budget year"
        description="Ongoing projects by funding year, split by whether any progress has been reported."
        summary="This breakdown is not available for this dashboard response."
      >
        <ChartEmptyState title="This breakdown is unavailable" detail="Refresh the dashboard to try again." />
      </ChartPanel>
    );
  }

  const chartData = data.filter((row) => row.yearFunded !== "Unknown" && (row.zeroProgress + row.someProgress) > 0);
  const summary = chartData.length > 0
    ? chartData.map((row) => `Funded ${row.yearFunded}: ${row.zeroProgress} still at 0%, ${row.someProgress} with some progress`).join("; ")
    : "No ongoing projects with a known funding year.";

  return (
    <ChartPanel
      title="Ongoing projects, by budget year"
      description="Red means the record still says 0% progress."
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer config={SERIES_CONFIG} className="h-60 w-full aspect-auto" role="img" aria-label="Ongoing projects by funding year">
          <BarChart data={chartData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="yearFunded" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="zeroProgress" name="zeroProgress" stackId="year" fill="var(--color-zeroProgress)" />
            <Bar dataKey="someProgress" name="someProgress" stackId="year" fill="var(--color-someProgress)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
