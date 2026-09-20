"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useChartDrilldown } from "@/hooks/use-chart-drilldown";
import type {
  ManagerialDashboardBreakdownRow,
  ManagerialDashboardData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";
import { ChartContextMenu, ChartOptionsMenu } from "./chart-context-menu";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatRegionAxisLabel } from "./regional-performance-chart";

type RegionRow = ManagerialDashboardData["regions"][number];
type ChartRow = { key: string; label: string; delayed: number; total: number };

export function rankDelayedRegions(data: RegionRow[], limit = 8) {
  return data
    .filter((item) => item.delayed > 0)
    .sort((left, right) => right.delayed - left.delayed || left.region.localeCompare(right.region, "en-PH"))
    .slice(0, limit);
}

export function rankDelayedBreakdown(rows: ManagerialDashboardBreakdownRow[], limit = 8) {
  return rows
    .filter((item) => item.delayed > 0)
    .sort((left, right) => right.delayed - left.delayed || left.key.localeCompare(right.key, "en-PH"))
    .slice(0, limit);
}

function formatProvinceAxisLabel(province: string) {
  return province.length > 24 ? `${province.slice(0, 23)}…` : province;
}

export function DelayedProjectsByRegionChart({
  data,
  filters,
  viewerKey,
  onDrillthrough,
}: {
  data: ManagerialDashboardData["regions"];
  filters: ManagerialDashboardFilters;
  viewerKey?: string;
  onDrillthrough?: (region: string, province?: string) => void;
}) {
  const drilldown = useChartDrilldown({
    filters,
    parentField: "region",
    dimension: "province",
    viewerKey,
  });
  const [contextTarget, setContextTarget] = useState<string | null>(null);

  const topLevelData = rankDelayedRegions(data);
  const provinceData = drilldown.data ? rankDelayedBreakdown(drilldown.data.rows) : [];
  const chartData: ChartRow[] = drilldown.isDrilledIn
    ? provinceData.map((item) => ({ key: item.key, label: formatProvinceAxisLabel(item.key), delayed: item.delayed, total: item.total }))
    : topLevelData.map((item) => ({ key: item.region, label: formatRegionAxisLabel(item.region), delayed: item.delayed, total: item.total }));

  const assessedProjects = data.reduce((total, item) => total + item.assessed, 0);
  const totalProjects = data.reduce((total, item) => total + item.total, 0);
  const allProjectsAssessed = totalProjects > 0 && assessedProjects === totalProjects;
  const coverageSummary = `${assessedProjects.toLocaleString("en-PH")} of ${totalProjects.toLocaleString("en-PH")} projects assessed`;
  const summary = chartData.length > 0
    ? `${chartData.map((item) => `${item.label}: ${item.delayed.toLocaleString("en-PH")} delayed projects`).join("; ")}. ${coverageSummary}.`
    : assessedProjects === 0
      ? "Delayed projects cannot be assessed because schedule data is unavailable."
      : allProjectsAssessed
        ? "No delayed projects are identified for the current filters."
        : `No delayed projects identified among ${coverageSummary}.`;

  function openDetails(entry: ChartRow) {
    if (!onDrillthrough) return;
    if (drilldown.isDrilledIn && drilldown.parent) onDrillthrough(drilldown.parent, entry.key);
    else onDrillthrough(entry.key);
  }

  const contextRow = chartData.find((item) => item.key === contextTarget) ?? null;

  return (
    <ChartPanel
      title="Which regions have the most delayed projects?"
      description={drilldown.isDrilledIn
        ? `Delayed projects by province within ${drilldown.parent}. Select a bar to see its projects.`
        : `Delayed projects based on recorded schedule dates. ${coverageSummary}. Select a bar to drill into its provinces.`}
      summary={summary}
      headerAction={
        <div className="flex shrink-0 items-center gap-1.5">
          {drilldown.isDrilledIn ? (
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5 px-3 text-sm" onClick={drilldown.drillUp}>
              <ArrowUp className="size-4" aria-hidden="true" />
              Back to regions
            </Button>
          ) : null}
          {chartData.length > 0 ? (
            <ChartOptionsMenu
              drillTargets={!drilldown.isDrilledIn ? topLevelData.map((item) => ({ key: item.region, label: `${item.region} (${item.delayed} delayed)` })) : undefined}
              onDrillInto={!drilldown.isDrilledIn ? drilldown.drillDown : undefined}
              detailTargets={chartData.map((item) => ({ key: item.key, label: `${item.label} (${item.delayed} delayed)` }))}
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
        <ChartEmptyState title="Loading province breakdown…" />
      ) : drilldown.isDrilledIn && drilldown.error ? (
        <ChartEmptyState title="Province breakdown unavailable." detail="Try again, or use Back to regions to return to the regional view." />
      ) : chartData.length === 0 ? (
        <ChartEmptyState
          title={drilldown.isDrilledIn
            ? `No delayed projects identified for ${drilldown.parent}.`
            : assessedProjects === 0
              ? "Delayed-project data unavailable."
              : allProjectsAssessed
                ? "No delayed projects for the current filters."
                : "No regional delays identified."}
          detail={drilldown.isDrilledIn
            ? undefined
            : assessedProjects === 0
              ? "No projects in the current scope have sufficient schedule data for regional delay assessment."
              : allProjectsAssessed
                ? "No assessed project in the current scope is past its recorded target date."
                : `Based on ${coverageSummary}; unassessed projects are not represented as on track.`}
        />
      ) : (
        <ChartContextMenu
          hasTarget={contextRow !== null}
          drillDownLabel={!drilldown.isDrilledIn && contextRow ? `Drill down to ${contextRow.label}` : undefined}
          onDrillDown={!drilldown.isDrilledIn && contextRow ? () => drilldown.drillDown(contextRow.key) : undefined}
          drillUpLabel={drilldown.isDrilledIn ? `Drill up to regions` : undefined}
          onDrillUp={drilldown.isDrilledIn ? drilldown.drillUp : undefined}
          seeDetailsLabel={contextRow ? `See details for ${contextRow.label}` : "See details"}
          onSeeDetails={() => contextRow && openDetails(contextRow)}
        >
          <ChartContainer
            config={{ delayed: { label: "Delayed projects", color: "#dc2626" } }}
            className="w-full aspect-auto"
            style={{ height: Math.max(260, chartData.length * 38) }}
            role="img"
            aria-label={drilldown.isDrilledIn ? `Delayed project counts by province within ${drilldown.parent}` : "Delayed project counts by region"}
          >
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} label={{ value: "Projects", position: "insideBottom", offset: -4, fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={175} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value, _name, item) => (
                  <div className="grid gap-0.5">
                    <span>{Number(value).toLocaleString("en-PH")} delayed projects</span>
                    <span>{Number((item.payload as ChartRow)?.total ?? 0).toLocaleString("en-PH")} total projects</span>
                  </div>
                )} />}
              />
              <Bar
                dataKey="delayed"
                fill="var(--color-delayed)"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onMouseDown={(entry, _index, event) => {
                  if (event.button === 2) setContextTarget((entry.payload as ChartRow)?.key ?? null);
                }}
                onClick={(entry) => {
                  const row = entry.payload as ChartRow;
                  if (!drilldown.isDrilledIn) drilldown.drillDown(row.key);
                }}
              />
            </BarChart>
          </ChartContainer>
        </ChartContextMenu>
      )}
    </ChartPanel>
  );
}
