"use client";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

function formatCost(value: number | null) {
  return value === null ? "Unavailable" : formatDashboardCurrency(value);
}

export function CommonProjectTypesTable({ data }: { data: ManagerialDashboardData["commonProjectTypes"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="What are the most common project types?"
        description="The 20 project types with the most projects in the current scope, with typical cost and usual price range."
        summary="Common project types are not available for this dashboard response."
      >
        <ChartEmptyState
          title="Common project types are unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const summary = data.length > 0
    ? data.map((row) => `${row.projectType}: ${row.total} projects, typical cost ${formatCost(row.medianBudget)}`).join("; ")
    : "No project-type data is available.";

  return (
    <ChartPanel
      title="What are the most common project types?"
      description="The 20 project types with the most projects in the current scope. Typical cost is the median approved budget; usual price range spans the 25th to 75th percentile. Both exclude projects with no usable budget on file."
      summary={summary}
    >
      {data.length === 0 ? <ChartEmptyState /> : (
        <>
          <p className="border-b border-slate-100 py-2 text-sm text-slate-500 sm:hidden dark:border-slate-800 dark:text-slate-400">
            Swipe or use Shift plus mouse wheel to view all columns.
          </p>
          <div
            aria-label="Scrollable common project types table"
            tabIndex={0}
            className="overflow-x-auto rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-800"
          >
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Project type</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Category</th>
                  <th scope="col" className="bg-slate-50/80 px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Count</th>
                  <th scope="col" className="bg-slate-50/80 px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Total budget</th>
                  <th scope="col" className="bg-slate-50/80 px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Typical cost</th>
                  <th scope="col" className="bg-slate-50/80 px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Price range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((row) => (
                  <tr key={row.projectType} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{row.projectType}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{row.category ?? "Unclassified"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.total.toLocaleString("en-PH")}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatDashboardCurrency(row.allocatedBudget)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatCost(row.medianBudget)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                      {row.p25Budget === null || row.p75Budget === null ? "Unavailable" : `${formatCost(row.p25Budget)} – ${formatCost(row.p75Budget)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ChartPanel>
  );
}
