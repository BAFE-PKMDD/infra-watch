"use client";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { RangeDotChart } from "./range-dot-chart";

export function NtpLagChart({ data }: { data: ManagerialDashboardData["ntpLagByProcurementMode"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="How long before construction can start"
        description="Days from when the year's budget takes effect until the contractor gets the go signal (Notice to Proceed)."
        summary="This breakdown is not available for this dashboard response."
      >
        <ChartEmptyState title="This breakdown is unavailable" detail="Refresh the dashboard to try again." />
      </ChartPanel>
    );
  }

  const rows = data
    .filter((row) => row.mode !== "Unknown" && row.medianDays !== null && row.p25Days !== null && row.p75Days !== null)
    .map((row) => ({ key: row.mode, label: row.mode, median: row.medianDays as number, p25: row.p25Days as number, p75: row.p75Days as number }))
    .sort((a, b) => b.median - a.median);

  const summary = rows.length > 0
    ? rows.map((row) => `${row.label}: ${Math.round(row.median)} days typical`).join("; ")
    : "Not enough projects with a recorded start date and procurement mode.";

  return (
    <ChartPanel
      title="How long before construction can start"
      description="Days from when the year's budget takes effect (assumed January 1 of the funding year) until the contractor's start date, by procurement mode."
      summary={summary}
    >
      {rows.length === 0 ? <ChartEmptyState /> : (
        <RangeDotChart
          rows={rows}
          valueFormatter={(value) => `${Math.round(value)} days`}
          ariaLabel="Days before construction can start, by procurement mode"
        />
      )}
    </ChartPanel>
  );
}
