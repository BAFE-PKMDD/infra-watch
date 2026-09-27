"use client";

import { useMemo, useState } from "react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { formatDashboardCurrency } from "./executive-kpis";

type ContractorRow = NonNullable<ManagerialDashboardData["contractors"]>[number];
type SortKey = "projectsChecked" | "medianLateDays" | "overThreeMonthsLatePct" | "contractValue";

const SORT_LABELS: Record<SortKey, string> = {
  projectsChecked: "Projects checked",
  medianLateDays: "Usually finishes",
  overThreeMonthsLatePct: "Over 3 months late",
  contractValue: "Contract value",
};

function formatDays(value: number | null) {
  if (value === null) return "Unavailable";
  return value <= 0 ? "On time" : `${Math.round(value)} days late`;
}

function formatPct(value: number | null) {
  return value === null ? "Unavailable" : `${value.toFixed(0)}%`;
}

export function ContractorTrackRecordTable({ data }: { data: ManagerialDashboardData["contractors"] }) {
  const [minProjects, setMinProjects] = useState(8);
  const [sort, setSort] = useState<SortKey>("projectsChecked");

  const visible = useMemo(() => {
    if (!data) return [];
    return [...data]
      .filter((row) => row.projectsChecked >= minProjects)
      .sort((a, b) => (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity));
  }, [data, minProjects, sort]);

  if (!data) {
    return (
      <ChartPanel
        title="Contractor track record"
        description="Contractors with enough checked construction projects to compare, based on lightly normalized contractor names."
        summary="Contractor data is not available for this dashboard response."
      >
        <ChartEmptyState title="Contractor data is unavailable" detail="Refresh the dashboard to try again." />
      </ChartPanel>
    );
  }

  const summary = visible.length > 0
    ? visible.map((row: ContractorRow) => `${row.name}: ${row.projectsChecked} projects, ${formatDays(row.medianLateDays)}`).join("; ")
    : "No contractor has enough checked projects at this threshold.";

  return (
    <ChartPanel
      title="Contractor track record"
      description={`${data.length} contractor${data.length === 1 ? "" : "s"} with at least 8 checked construction projects. Contractor names are lightly normalized (trimmed and case-folded only), so different spellings of the same company may still appear separately.`}
      summary={summary}
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Sort by
            <select
              aria-label="Sort contractors"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Show contractors with at least
            <select
              aria-label="Minimum projects checked"
              value={minProjects}
              onChange={(event) => setMinProjects(Number(event.target.value))}
              className="h-11 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {[8, 10, 15, 20].map((n) => <option key={n} value={n}>{n} projects</option>)}
            </select>
          </label>
        </div>
      }
    >
      {visible.length === 0 ? (
        <ChartEmptyState detail="No contractor meets the current minimum-projects threshold." />
      ) : (
        <>
          <p className="border-b border-slate-100 py-2 text-sm text-slate-500 sm:hidden dark:border-slate-800 dark:text-slate-400">
            Swipe or use Shift plus mouse wheel to view all columns.
          </p>
          <div
            aria-label="Scrollable contractor track record table"
            tabIndex={0}
            className="overflow-x-auto rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-800"
          >
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Contractor</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Projects checked</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Usually finishes</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Finished late</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Over 3 months late</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Contract value</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Regions</th>
                  <th scope="col" className="bg-slate-50/80 px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Mostly builds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.projectsChecked.toLocaleString("en-PH")}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatDays(row.medianLateDays)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatPct(row.latePct)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatPct(row.overThreeMonthsLatePct)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatDashboardCurrency(row.contractValue)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.regionCount}</td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{row.mostlyBuilds ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-200">Read with care.</strong> A project counts as late when it finished after its deadline (target completion date). Approved time extensions or suspensions are not distinguished here, so a contractor with valid extensions will look later than they really were. Use this table to decide which project files to review, not to judge a contractor.
          </p>
        </>
      )}
    </ChartPanel>
  );
}
