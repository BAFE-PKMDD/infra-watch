"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useChartDrilldown } from "@/hooks/use-chart-drilldown";
import type {
  ManagerialDashboardBreakdownRow,
  ManagerialDashboardData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";
import { ChartContextMenu, ChartOptionsMenu } from "./chart-context-menu";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCompactCurrency, formatDashboardCurrency } from "./executive-kpis";

type ProjectTypeRow = ManagerialDashboardData["projectTypes"][number];
type ChartRow = { key: string; label: string; allocatedBudget: number; total: number; delayed: number; drillable: boolean };

export function formatProjectTypeAxisLabel(projectType: string) {
  return projectType.length > 24 ? `${projectType.slice(0, 23)}…` : projectType;
}

export function selectProjectType(onSelect: (projectType: string) => void, projectType: string) {
  if (projectType !== "Other") onSelect(projectType);
}

export function limitProjectTypes(data: ProjectTypeRow[], limit = 8): ProjectTypeRow[] {
  if (data.length <= limit) return data;
  const unknown = data.find((item) => item.projectType === "Unknown");
  const ranked = data.filter((item) => item.projectType !== "Unknown").sort((a, b) => b.allocatedBudget - a.allocatedBudget);
  const reserved = unknown ? 2 : 1;
  const kept = ranked.slice(0, Math.max(limit - reserved, 0));
  const remainder = ranked.slice(kept.length);
  const other = remainder.reduce<ProjectTypeRow>((total, item) => ({
    projectType: "Other",
    total: total.total + item.total,
    allocatedBudget: total.allocatedBudget + item.allocatedBudget,
    delayed: total.delayed + item.delayed,
  }), { projectType: "Other", total: 0, allocatedBudget: 0, delayed: 0 });
  return [...kept, ...(other.total > 0 ? [other] : []), ...(unknown ? [unknown] : [])];
}

export function limitBreakdownByBudget(rows: ManagerialDashboardBreakdownRow[], limit = 8) {
  return [...rows].sort((a, b) => b.allocatedBudget - a.allocatedBudget || a.key.localeCompare(b.key, "en-PH")).slice(0, limit);
}

export function ProjectTypeBudgetChart({
  data,
  filters,
  viewerKey,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["projectTypes"];
  filters: ManagerialDashboardFilters;
  viewerKey?: string;
  onDrillthrough?: (projectType: string, options?: { excludedProjectTypes?: string[]; program?: string }) => void;
}) {
  const drilldown = useChartDrilldown({
    filters,
    parentField: "projectType",
    dimension: "program",
    viewerKey,
  });
  const [contextTarget, setContextTarget] = useState<string | null>(null);

  const topLevelData = limitProjectTypes(data);
  const namedProjectTypes = topLevelData
    .filter((item) => item.projectType !== "Other" && item.projectType !== "Unknown")
    .map((item) => item.projectType);
  const breakdownData = drilldown.data ? limitBreakdownByBudget(drilldown.data.rows) : [];

  const chartData: ChartRow[] = drilldown.isDrilledIn
    ? breakdownData.map((item) => ({ key: item.key, label: formatProjectTypeAxisLabel(item.key), allocatedBudget: item.allocatedBudget, total: item.total, delayed: item.delayed, drillable: false }))
    : topLevelData.map((item) => ({ key: item.projectType, label: formatProjectTypeAxisLabel(item.projectType), allocatedBudget: item.allocatedBudget, total: item.total, delayed: item.delayed, drillable: item.projectType !== "Other" }));

  function openDetails(entry: ChartRow) {
    if (!onDrillthrough) return;
    if (drilldown.isDrilledIn && drilldown.parent) onDrillthrough(drilldown.parent, { program: entry.key });
    else onDrillthrough(entry.key, entry.key === "Other" ? { excludedProjectTypes: namedProjectTypes } : undefined);
  }

  const summary = chartData.length > 0
    ? chartData.map((item) => `${item.label}: ${formatDashboardCurrency(item.allocatedBudget)} across ${item.total} projects`).join("; ")
    : "No project-type budget data available.";
  const contextRow = chartData.find((item) => item.key === contextTarget) ?? null;

  return (
    <ChartPanel
      title="How is the approved budget distributed?"
      description={drilldown.isDrilledIn
        ? `Approved budget by program within ${drilldown.parent}. Select a bar to view its projects.`
        : "Approved budget by project type. Select a bar to drill into its programs; smaller categories are combined as Other."}
      summary={summary}
      headerAction={
        <div className="flex shrink-0 items-center gap-1.5">
          {drilldown.isDrilledIn ? (
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5 px-3 text-sm" onClick={drilldown.drillUp}>
              <ArrowUp className="size-4" aria-hidden="true" />
              Back to project types
            </Button>
          ) : null}
          {chartData.length > 0 ? (
            <ChartOptionsMenu
              drillTargets={!drilldown.isDrilledIn ? chartData.filter((item) => item.drillable).map((item) => ({ key: item.key, label: item.label })) : undefined}
              onDrillInto={!drilldown.isDrilledIn ? drilldown.drillDown : undefined}
              detailTargets={chartData.map((item) => ({ key: item.key, label: `${item.label} (${item.total} projects)` }))}
              onSeeDetails={(key) => {
                const row = chartData.find((item) => item.key === key);
                if (row) openDetails(row);
              }}
            />
          ) : null}
        </div>
      }
    >
      {drilldown.isPending ? (
        <ChartEmptyState title="Loading program breakdown…" />
      ) : drilldown.isDrilledIn && drilldown.error ? (
        <ChartEmptyState title="Program breakdown unavailable." detail="Try again, or use Back to project types to return to the project-type view." />
      ) : chartData.length === 0 ? (
        <ChartEmptyState detail={drilldown.isDrilledIn ? `No program budget data available for ${drilldown.parent}.` : undefined} />
      ) : (
        <ChartContextMenu
          hasTarget={contextRow !== null}
          drillDownLabel={!drilldown.isDrilledIn && contextRow?.drillable ? `Drill down to ${contextRow.label}` : undefined}
          onDrillDown={!drilldown.isDrilledIn && contextRow?.drillable ? () => drilldown.drillDown(contextRow.key) : undefined}
          drillUpLabel={drilldown.isDrilledIn ? "Drill up to project types" : undefined}
          onDrillUp={drilldown.isDrilledIn ? drilldown.drillUp : undefined}
          seeDetailsLabel={contextRow ? `See details for ${contextRow.label}` : "See details"}
          onSeeDetails={() => contextRow && openDetails(contextRow)}
        >
          <ChartContainer config={{ allocatedBudget: { label: "Allocated budget", color: "var(--primary)" } }} className="h-80 w-full aspect-auto" role="img" aria-label={drilldown.isDrilledIn ? `Allocated budget by program within ${drilldown.parent}` : "Allocated budget by project type"}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatDashboardCompactCurrency(Number(value))} />
              <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatDashboardCurrency(Number(value))} />} />
              <Bar
                dataKey="allocatedBudget"
                fill="var(--color-allocatedBudget)"
                radius={[0, 5, 5, 0]}
                className="cursor-pointer"
                onMouseDown={(entry, _index, event) => {
                  if (event.button === 2) setContextTarget((entry.payload as ChartRow)?.key ?? null);
                }}
                onClick={(entry) => {
                  const row = entry.payload as ChartRow;
                  if (!drilldown.isDrilledIn && row.drillable) drilldown.drillDown(row.key);
                }}
              />
            </BarChart>
          </ChartContainer>
        </ChartContextMenu>
      )}
    </ChartPanel>
  );
}
