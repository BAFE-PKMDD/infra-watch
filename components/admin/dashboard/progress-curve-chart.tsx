"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useProgressCurve } from "@/hooks/use-progress-curve";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

export function ProgressCurveChart({
  progressVariance,
  viewerKey,
}: {
  progressVariance: ManagerialDashboardData["progressVariance"];
  viewerKey?: string;
}) {
  const candidates = [...progressVariance].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const query = useProgressCurve(selected, viewerKey);

  const points = query.data?.points ?? [];
  const summary = query.data
    ? `${query.data.projectName}: ${points.length} snapshot${points.length === 1 ? "" : "s"} of reported progress.`
    : "Pick an ongoing project to compare its planned and actual progress over time.";

  return (
    <ChartPanel
      title="Planned vs actual progress"
      description="Pick an ongoing project to compare where it should be today against where it actually is. &quot;Planned&quot; assumes work advances evenly from the start date to the target completion date, the same assumption used elsewhere on this dashboard."
      summary={summary}
      headerAction={
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Project
          <select
            aria-label="Project for planned vs actual progress"
            value={selected ?? ""}
            onChange={(event) => setSelected(event.target.value || undefined)}
            className="h-11 min-w-64 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Choose a project</option>
            {candidates.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {Math.abs(Math.round(project.variance))} points {project.variance < 0 ? "behind" : "ahead"} &middot; {project.projectName}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {!selected ? (
        <ChartEmptyState title="Choose a project" detail="Pick an ongoing project above to see its progress curve." />
      ) : query.isPending ? (
        <ChartEmptyState title="Loading progress curve…" />
      ) : query.error ? (
        <ChartEmptyState title="Progress curve unavailable" detail="Try choosing the project again." />
      ) : points.length === 0 ? (
        <ChartEmptyState detail="No progress snapshots have been recorded for this project yet." />
      ) : (
        <ChartContainer
          config={{
            plannedProgress: { label: "Planned progress", color: "var(--muted-foreground)" },
            actualProgress: { label: "Actual progress", color: "var(--a-s3, #2563eb)" },
          }}
          className="h-64 w-full aspect-auto"
          role="img"
          aria-label={`Planned vs actual progress for ${query.data?.projectName}`}
        >
          <LineChart data={points} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent labelKey="date" formatter={(value, name) => (
              <span>{name === "plannedProgress" ? "Planned" : "Actual"}: {Number(value).toFixed(1)}%</span>
            )} />} />
            <Line type="monotone" dataKey="plannedProgress" stroke="var(--color-plannedProgress)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="actualProgress" stroke="var(--color-actualProgress)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      )}
    </ChartPanel>
  );
}
