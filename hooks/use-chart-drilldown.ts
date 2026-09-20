import { useState } from "react";

import { serializeManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import type {
  DashboardBreakdownDimension,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";
import { useDashboardBreakdown } from "./use-dashboard-breakdown";

type DrilldownParentField = "region" | "projectType";

/**
 * Local, chart-only drill state (Power BI style): drilling into a bar swaps
 * that chart's own category axis to the next dimension without touching the
 * page's URL-synced global filters. If the global filters change while a
 * chart is drilled in, the chart resets to its top level so it can never
 * silently show a breakdown inconsistent with the active filters.
 */
export function useChartDrilldown({
  filters,
  parentField,
  dimension,
  viewerKey,
}: {
  filters: ManagerialDashboardFilters;
  parentField: DrilldownParentField;
  dimension: DashboardBreakdownDimension;
  viewerKey: string | undefined;
}) {
  const [parent, setParent] = useState<string | null>(null);
  const filtersKey = serializeManagerialDashboardFilters(filters).toString();
  const [lastFiltersKey, setLastFiltersKey] = useState(filtersKey);

  if (filtersKey !== lastFiltersKey) {
    setLastFiltersKey(filtersKey);
    if (parent !== null) setParent(null);
  }

  const isDrilledIn = parent !== null;
  const drilledFilters: ManagerialDashboardFilters = isDrilledIn
    ? { ...filters, [parentField]: parent }
    : filters;

  const query = useDashboardBreakdown(drilledFilters, dimension, viewerKey, isDrilledIn);

  return {
    isDrilledIn,
    parent,
    drillDown: (value: string) => setParent(value),
    drillUp: () => setParent(null),
    data: query.data,
    isPending: isDrilledIn && query.isPending,
    error: query.error,
  };
}
