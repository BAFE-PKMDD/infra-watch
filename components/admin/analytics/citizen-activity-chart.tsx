"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CitizenEngagementAnalytics } from "@/lib/analytics/citizen-engagement-query";

const chartConfig = {
  searches: { label: "Searches", color: "#2563eb" },
  projectViews: { label: "Project views", color: "#7c3aed" },
  mapViews: { label: "Map views", color: "#0891b2" },
  ratingsSubmitted: { label: "Ratings", color: "#d97706" },
  commentsSubmitted: { label: "Comments", color: "#dc2626" },
} satisfies ChartConfig;

export function CitizenActivityChart({ trend }: { trend: CitizenEngagementAnalytics["trend"] }) {
  const total = trend.reduce(
    (sum, day) => sum + day.searches + day.projectViews + day.mapViews + day.ratingsSubmitted + day.commentsSubmitted,
    0,
  );
  const summary = total === 0
    ? "No recorded citizen actions in the selected period."
    : `${total.toLocaleString("en-PH")} recorded actions across ${trend.length} calendar days. Counts are actions, not unique people.`;

  return (
    <>
      <p className="sr-only">{summary}</p>
      <ChartContainer
        config={chartConfig}
        className="mt-4 h-72 w-full aspect-auto"
        role="img"
        aria-label="Daily activity graph showing searches, project views, map views, ratings, and comments"
      >
        <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {Object.entries(chartConfig).map(([key, config]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </>
  );
}
