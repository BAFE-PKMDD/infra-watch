"use client";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

const CATEGORY_LABELS: Record<string, string> = {
  "Agricultural Support Services Facility": "Agri Support",
  "Agricultural Transport and Infrastructure": "Agri Transport",
  "Irrigation System": "Irrigation",
  "Laboratory": "Lab",
  "Post Harvest Facility": "Post Harvest",
  "Processing Facility": "Processing",
  "Production Facility": "Production",
  "Storage Facility": "Storage",
  "Waste Management and Recovery": "Waste Mgmt",
};

function shortLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

export function RegionCategoryHeatTable({ data }: { data: ManagerialDashboardData["regionCategories"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="What does each region build?"
        description="Project counts by region and facility category."
        summary="Region-by-category data is not available for this dashboard response."
      >
        <ChartEmptyState
          title="Region-by-category data is unavailable"
          detail="This breakdown was not returned with the current dashboard data. Refresh the dashboard to try again."
        />
      </ChartPanel>
    );
  }

  const rows = data.filter((row) => row.region !== "Unknown");
  const categories = rows.length > 0 ? Object.keys(rows[0].categories) : [];
  const maxCount = Math.max(1, ...rows.flatMap((row) => categories.map((category) => row.categories[category]?.count ?? 0)));

  const summary = rows.length > 0
    ? rows.map((row) => `${row.region}: ${categories.map((category) => `${row.categories[category]?.count ?? 0} ${category}`).join(", ")}`).join("; ")
    : "No region-by-category data is available.";

  return (
    <ChartPanel
      title="What does each region build?"
      description="Number of projects per region and facility category. Darker cells mean more projects; hover a cell for details."
      summary={summary}
    >
      {rows.length === 0 ? <ChartEmptyState /> : (
        <>
          <p className="border-b border-slate-100 py-2 text-sm text-slate-500 sm:hidden dark:border-slate-800 dark:text-slate-400">
            Swipe to view all columns.
          </p>
          <div
            aria-label="Scrollable region facility mix table"
            tabIndex={0}
            className="overflow-x-auto rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-800"
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-slate-50/80 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Region</th>
                  {categories.map((category) => (
                    <th key={category} scope="col" title={category} className="bg-slate-50/80 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400 whitespace-nowrap">
                      {shortLabel(category)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.region}>
                    <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 dark:bg-slate-900 dark:text-slate-100">{row.region}</th>
                    {categories.map((category) => {
                      const cell = row.categories[category] ?? { count: 0, budget: 0 };
                      const intensity = cell.count / maxCount;
                      return (
                        <td
                          key={category}
                          tabIndex={cell.count > 0 ? 0 : undefined}
                          title={`${row.region} — ${category}: ${cell.count.toLocaleString("en-PH")} projects, ${formatDashboardCurrency(cell.budget)}`}
                          className="px-2 py-2 text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                          style={{
                            background: cell.count > 0 ? `color-mix(in srgb, var(--a-heat-hi, #1c5cab) ${Math.round(intensity * 100)}%, var(--a-heat-lo, transparent))` : undefined,
                            color: intensity > 0.55 ? "#fff" : undefined,
                          }}
                        >
                          {cell.count > 0 ? cell.count.toLocaleString("en-PH") : <span className="text-slate-300 dark:text-slate-700">0</span>}
                        </td>
                      );
                    })}
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
