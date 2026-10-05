"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { SlaDistribution } from "@/types/reports.types";

export function SlaDistributionChart({
  data,
  title,
  description,
}: {
  data: SlaDistribution[];
  title: string;
  description?: string;
}) {
  const chartConfig = Object.fromEntries(
    data.map((entry) => [entry.tier, { label: entry.label, color: entry.color }]),
  );

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-slate-950 dark:text-white">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-slate-600 dark:text-slate-400">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!data.some((tier) => tier.count > 0) ? (
          <p role="status" className="py-12 text-center text-sm text-slate-600 dark:text-slate-300">No staff responses recorded for submissions in this period.</p>
        ) : <ChartContainer config={chartConfig} className="h-[300px] w-full" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                width={80}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                {data.map((entry) => (
                  <Cell key={entry.tier} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>}
      </CardContent>
    </Card>
  );
}
