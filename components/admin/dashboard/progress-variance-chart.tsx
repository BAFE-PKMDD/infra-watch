"use client";

import Link from "next/link";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";

type ProgressComparison = ManagerialDashboardData["progressVariance"][number];

function formatProgress(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatProgressDifference(item: ProgressComparison) {
  const difference = Math.abs(item.variance).toFixed(1);
  if (item.variance < 0) return `${difference} percentage points behind`;
  if (item.variance > 0) return `${difference} percentage points ahead`;
  return "On the expected pace";
}

export function ProgressVarianceChart({ data }: { data: ManagerialDashboardData["progressVariance"] }) {
  const projects = data.slice(0, 15);
  const summary = projects.length > 0
    ? projects.map((item) => `${item.projectName}: ${formatProgress(item.physicalProgress)} reported, ${formatProgress(item.expectedProgress)} expected by now, ${formatProgressDifference(item)}`).join("; ")
    : "No projects can currently be compared.";

  return (
    <ChartPanel
      title="Is reported progress keeping pace?"
      description="Compares each project’s reported physical completion with where it would be today if work progressed evenly from its start date to its target completion date."
      summary={summary}
    >
      {projects.length === 0 ? (
        <ChartEmptyState
          title="No projects can be compared yet."
          detail="This comparison needs an ongoing project with valid start and target dates and reported physical progress."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <caption className="sr-only">Reported and expected progress for active projects with the largest differences</caption>
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="px-3 py-2 font-medium">Project</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Reported progress</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Expected by now</th>
                  <th scope="col" className="px-3 py-2 font-medium">Difference</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((item) => {
                  const difference = formatProgressDifference(item);
                  const differenceTone = item.variance < 0
                    ? "text-amber-700 dark:text-amber-300"
                    : item.variance > 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-600 dark:text-slate-300";
                  return (
                    <tr key={item.projectId} className="border-b border-slate-100 last:border-0 dark:border-slate-800/80">
                      <td className="max-w-md px-3 py-2.5">
                        <Link href={`/projects/${encodeURIComponent(item.projectId)}`} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                          {item.projectName}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-900 dark:text-white">{formatProgress(item.physicalProgress)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-900 dark:text-white">{formatProgress(item.expectedProgress)}</td>
                      <td className={`px-3 py-2.5 font-medium ${differenceTone}`}>{difference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            How this is calculated: “Expected by now” assumes work advances evenly between the recorded project start date and target completion date. It is a schedule comparison, not a completion forecast.
          </p>
        </>
      )}
    </ChartPanel>
  );
}
