"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { SlaTrendPoint } from "@/types/reports.types";

const chartConfig = {
  avgResponseTime: {
    label: "Avg response (hours)",
    color: "#059669",
  },
};

export function SlaResponseChart({
  data,
  title,
  description,
}: {
  data: SlaTrendPoint[];
  title: string;
  description?: string;
}) {
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-slate-950 dark:text-white">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-slate-600 dark:text-slate-400">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="slaResponseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(value) => `${value}h`}
              />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "#10b981", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="avgResponseTime"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#slaResponseFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
