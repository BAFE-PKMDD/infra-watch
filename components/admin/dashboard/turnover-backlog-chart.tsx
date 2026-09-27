"use client";

import type { ManagerialDashboardData, TurnoverBucket } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

const BUCKET_LABELS: Record<TurnoverBucket, string> = {
  under6mo: "Under 6 months",
  "6to12mo": "6-12 months",
  "1to2yr": "1-2 years",
  "2to4yr": "2-4 years",
  over4yr: "Over 4 years",
};

export function TurnoverBacklogChart({ data }: { data: ManagerialDashboardData["turnoverBacklog"] }) {
  if (!data) {
    return (
      <ChartPanel
        title="Waiting for turn-over"
        description="How long finished projects have been waiting to be handed over to the beneficiary."
        summary="Turn-over data is not available for this dashboard response."
      >
        <ChartEmptyState title="Turn-over data is unavailable" detail="Refresh the dashboard to try again." />
      </ChartPanel>
    );
  }

  const total = data.buckets.reduce((sum, row) => sum + row.count, 0);
  const overOneYear = data.buckets
    .filter((row) => row.bucket === "1to2yr" || row.bucket === "2to4yr" || row.bucket === "over4yr")
    .reduce((sum, row) => sum + row.count, 0);

  const summary = total > 0
    ? data.buckets.map((row) => `${BUCKET_LABELS[row.bucket]}: ${row.count.toLocaleString("en-PH")}`).join("; ")
    : "No completed projects are recorded as still waiting for turn-over.";

  return (
    <ChartPanel
      title="Waiting for turn-over"
      description="Completed projects (with a completion date on file) that have no recorded turn-over date yet, by how long they've been waiting."
      summary={summary}
    >
      {total === 0 ? <ChartEmptyState /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{overOneYear.toLocaleString("en-PH")}</strong> of {total.toLocaleString("en-PH")} have been waiting more than a year.
            </p>
            <ul className="mt-3 list-none space-y-2 p-0">
              {data.buckets.map((row) => (
                <li key={row.bucket}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{BUCKET_LABELS[row.bucket]}</span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">{row.count.toLocaleString("en-PH")}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? (row.count / total) * 100 : 0}%`, background: "var(--a-crit, #dc2626)" }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Waiting for turn-over, per region</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Most waiting at the top.</p>
            {data.byRegion.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No region has a project waiting for turn-over.</p>
            ) : (
              <div
                aria-label="Scrollable waiting for turn-over per region table"
                tabIndex={0}
                className="mt-3 max-h-64 overflow-auto rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-800"
              >
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="sticky top-0 bg-slate-50/90 px-3 py-2 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Region</th>
                      <th scope="col" className="sticky top-0 bg-slate-50/90 px-3 py-2 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Waiting</th>
                      <th scope="col" className="sticky top-0 bg-slate-50/90 px-3 py-2 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Over 1 year</th>
                      <th scope="col" className="sticky top-0 bg-slate-50/90 px-3 py-2 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.byRegion.map((row) => (
                      <tr key={row.region}>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{row.region}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.waiting.toLocaleString("en-PH")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.waitingOver1Year.toLocaleString("en-PH")}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatDashboardCurrency(row.allocatedBudget)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </ChartPanel>
  );
}
