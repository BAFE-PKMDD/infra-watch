"use client";

import { useState } from "react";

import { useRegionCostByType } from "@/hooks/use-region-cost-by-type";
import type { ManagerialDashboardData, ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";
import { RangeDotChart } from "./range-dot-chart";

// A type needs at least 5 projects in a single region to clear the region-cost
// query's own 5-per-region floor, so a type with fewer than 5 anywhere in the
// portfolio can never produce a result — leaving it out of the picker instead
// of offering a choice that always lands on "no data".
const REGION_COST_MIN_SAMPLE = 5;

export function RegionCostByTypeChart({
  projectTypes,
  filters,
  viewerKey,
}: {
  projectTypes: ManagerialDashboardData["projectTypes"];
  filters: ManagerialDashboardFilters;
  viewerKey?: string;
}) {
  const options = projectTypes
    .filter((type) => type.projectType !== "Unknown" && type.total >= REGION_COST_MIN_SAMPLE)
    .map((type) => type.projectType)
    .sort((a, b) => a.localeCompare(b, "en-PH"));
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const query = useRegionCostByType(filters, selected, viewerKey);

  const rows = (query.data?.regions ?? []).map((row) => ({
    key: row.region,
    label: row.region,
    median: row.medianBudget as number,
    p25: row.p25Budget as number,
    p75: row.p75Budget as number,
  }));

  const summary = query.data && rows.length > 0
    ? `A typical ${query.data.projectType} costs ${formatDashboardCurrency(query.data.nationwide.medianBudget ?? 0)} nationwide. ${rows.map((row) => `${row.label}: ${formatDashboardCurrency(row.median)} typical`).join("; ")}`
    : `Choose a project type to see its typical cost by region.`;

  return (
    <ChartPanel
      title="How much the same facility costs in each region"
      description="Built projects only. The dot is the typical cost; the bar shows the usual price range (25th to 75th percentile). Regions with fewer than 5 matching projects are left out."
      summary={summary}
      headerAction={
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Project type
          <select
            aria-label="Project type for cost-by-region comparison"
            value={selected ?? ""}
            onChange={(event) => setSelected(event.target.value || undefined)}
            className="h-11 min-w-52 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Choose a type</option>
            {options.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
      }
    >
      {!selected ? (
        <ChartEmptyState title="Choose a project type" detail="Pick a facility type above to compare its typical cost across regions." />
      ) : query.isPending ? (
        <ChartEmptyState title="Loading cost comparison…" />
      ) : query.error ? (
        <ChartEmptyState title="Cost comparison unavailable" detail="Try choosing the project type again." />
      ) : rows.length === 0 ? (
        <ChartEmptyState detail={`No region has at least 5 ${selected} projects with a usable budget.`} />
      ) : (
        <>
          {query.data && (
            <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              A typical <strong className="text-slate-900 dark:text-white">{query.data.projectType}</strong> costs{" "}
              <strong className="text-slate-900 dark:text-white">{formatDashboardCurrency(query.data.nationwide.medianBudget ?? 0)}</strong> nationwide.
            </p>
          )}
          <RangeDotChart
            rows={rows}
            valueFormatter={(value) => formatDashboardCurrency(value)}
            ariaLabel={`Typical cost of ${selected} by region`}
            referenceValue={query.data?.nationwide.medianBudget ?? undefined}
          />
        </>
      )}
    </ChartPanel>
  );
}
