"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

type LateDaysRow = { key: string; medianLateDays: number | null; lateCount: number; totalWithDates: number };

export function LateDaysByDimensionChart({
  data,
  dimensionLabel,
}: {
  data: LateDaysRow[] | undefined;
  dimensionLabel: "region" | "type of facility";
}) {
  const title = `How late projects usually finish, per ${dimensionLabel}`;

  if (!data) {
    return (
      <ChartPanel
        title={title}
        description={`Typical days past the deadline for a late project, by ${dimensionLabel}.`}
        summary="This breakdown is not available for this dashboard response."
      >
        <ChartEmptyState
          title="This breakdown is unavailable"
          detail="It was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const chartData = [...data]
    .filter((row) => row.medianLateDays !== null)
    .sort((a, b) => (b.medianLateDays ?? 0) - (a.medianLateDays ?? 0));

  const summary = chartData.length > 0
    ? chartData.map((row) => `${row.key}: ${Math.round(row.medianLateDays ?? 0)} days typical, ${row.lateCount} of ${row.totalWithDates} late`).join("; ")
    : `Not enough late, dated projects per ${dimensionLabel} to show a typical delay.`;

  return (
    <ChartPanel
      title={title}
      description={`Days past the deadline for a typical late project. Only ${dimensionLabel === "region" ? "regions" : "types"} with enough late, dated projects to check are shown.`}
      summary={summary}
    >
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <ChartContainer
          config={{ medianLateDays: { label: "Typical days late", color: "var(--a-crit, #dc2626)" } }}
          className="w-full aspect-auto"
          style={{ height: Math.max(chartData.length * 30, 160) }}
          role="img"
          aria-label={title}
        >
          <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 40 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => `${Number(value)} days`} />
            <YAxis type="category" dataKey="key" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
              <span>{Number(value)} days typical · {item.payload?.lateCount} of {item.payload?.totalWithDates} late</span>
            )} />} />
            <Bar dataKey="medianLateDays" fill="var(--color-medianLateDays)" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
