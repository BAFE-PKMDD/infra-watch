"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

export function ProgressVarianceChart({ data }: { data: ManagerialDashboardData["progressVariance"] }) {
  const chartData = data.slice(0, 15);
  const summary = chartData.length > 0 ? chartData.map((item) => `${item.projectName}: ${Math.abs(item.variance).toFixed(1)} points ${item.variance < 0 ? "behind" : "ahead of"} expected schedule progress`).join("; ") : "No assessable progress-variance data available.";
  return (
    <ChartPanel title="Physical versus expected progress" description="Largest current variance among assessable active projects; rules-based, not a trend forecast." summary={summary}>
      {chartData.length === 0 ? <ChartEmptyState /> : (
        <>
          <ChartContainer config={{ expectedProgress: { label: "Expected", color: "#64748b" }, physicalProgress: { label: "Physical", color: "#0f766e" } }} className="h-72 w-full aspect-auto" role="img" aria-label="Physical and expected schedule progress by project">
            <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="projectName" tick={false} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}%`} />} />
              <Bar dataKey="expectedProgress" fill="var(--color-expectedProgress)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="physicalProgress" fill="var(--color-physicalProgress)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <ul className="mt-3 grid gap-1 text-xs text-slate-600 dark:text-slate-300">
            {chartData.slice(0, 5).map((item) => <li key={item.projectId}><Link href={`/projects/${encodeURIComponent(item.projectId)}`} className="font-bold text-primary hover:underline">{item.projectName}</Link>: {Math.abs(item.variance).toFixed(1)} points {item.variance < 0 ? "behind" : "ahead"}</li>)}
          </ul>
        </>
      )}
    </ChartPanel>
  );
}
