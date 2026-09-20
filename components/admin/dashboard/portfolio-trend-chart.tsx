"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

export function PortfolioTrendChart({ trend }: { trend: ManagerialDashboardData["trend"] }) {
  const summary = trend.status === "ready"
    ? `Average reported physical progress of active projects, tracked across ${trend.sampleCount} snapshot dates from ${trend.points[0]?.date} to ${trend.points.at(-1)?.date}.`
    : "Not enough continuous snapshot history to show a trend yet.";

  return (
    <ChartPanel
      title="Is the active pipeline's progress advancing?"
      description="Average reported physical progress across ongoing, non-completed projects, one point per day the ABEMIS sync captured a portfolio snapshot. A project stops appearing here once it is marked Completed. Shows only the most recent run of days with no gap over 7 days between them, and needs at least 14 days in that run."
      summary={summary}
    >
      {trend.status === "insufficientHistory" ? (
        <ChartEmptyState
          title="Not enough continuous history yet"
          detail={`Only ${trend.sampleCount} consecutive snapshot date${trend.sampleCount === 1 ? "" : "s"} recorded so far${trend.sampleCount >= 2 ? `, spanning ${trend.spanDays} day${trend.spanDays === 1 ? "" : "s"}` : ""}. An older, disconnected snapshot from before a run of sync failures is excluded rather than smoothed over. A reliable trend needs at least 14 consecutive days of daily history — this fills in automatically as syncs keep succeeding.`}
        />
      ) : (
        <ChartContainer
          config={{ averageProgress: { label: "Average progress", color: "#0f766e" } }}
          className="h-60 w-full aspect-auto"
          role="img"
          aria-label="Average physical progress of active projects over time"
        >
          <LineChart data={trend.points} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="date"
                  formatter={(value, _name, item) => (
                    <div className="grid gap-0.5">
                      <span>{Number(value).toFixed(1)}% average progress</span>
                      <span>
                        {item.payload?.sampleSize?.toLocaleString("en-PH")} of {item.payload?.total?.toLocaleString("en-PH")} active projects with reported progress
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line type="monotone" dataKey="averageProgress" stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
