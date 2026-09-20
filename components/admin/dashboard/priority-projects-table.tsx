"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ManagerialDashboardData,
  ScheduleHealth,
} from "@/types/managerial-dashboard.types";
import { formatDashboardCurrency } from "./executive-kpis";

const healthLabels: Record<ScheduleHealth, string> = {
  onTrack: "On schedule",
  atRisk: "At risk of delay",
  delayed: "Delayed",
  notAssessed: "Cannot be assessed",
};

type PriorityProject = ManagerialDashboardData["priorityProjects"][number];
export type PriorityProjectSort = "delay" | "budget" | "region" | "completion";

export function sortPriorityProjects(
  projects: PriorityProject[],
  sort: PriorityProjectSort,
) {
  return [...projects].sort((left, right) => {
    if (sort === "delay") {
      return compareNullable(left.daysToTarget, right.daysToTarget, "ascending");
    }
    if (sort === "budget") {
      return compareNullable(left.allocatedBudget, right.allocatedBudget, "descending");
    }
    if (sort === "completion") {
      return compareNullable(left.physicalProgress, right.physicalProgress, "ascending");
    }
    const regionComparison = (left.region ?? "").localeCompare(right.region ?? "", "en-PH");
    if (left.region === null && right.region !== null) return 1;
    if (right.region === null && left.region !== null) return -1;
    return regionComparison || left.projectName.localeCompare(right.projectName, "en-PH");
  });
}

function compareNullable(
  left: number | null,
  right: number | null,
  direction: "ascending" | "descending",
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "ascending" ? left - right : right - left;
}

export function PriorityProjectsTable({
  projects,
}: {
  projects: ManagerialDashboardData["priorityProjects"];
}) {
  const [sort, setSort] = useState<PriorityProjectSort>("delay");
  const visibleProjects = useMemo(
    () => sortPriorityProjects(projects, sort).slice(0, 5),
    [projects, sort],
  );

  return (
    <section aria-labelledby="priority-projects-heading" className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both delay-300 duration-500 border-t border-slate-200 pt-5 motion-reduce:animate-none dark:border-slate-800">
      <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="priority-projects-heading" className="text-xl font-semibold text-slate-950 dark:text-white">Projects requiring review</h2>
          <p className="mt-0.5 text-[15px] text-slate-500 dark:text-slate-400">
            {sort === "delay" ? "Five projects requiring the most immediate review in the current scope." : "Five displayed projects requiring review, sorted by the selected field."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {projects.length > 1 && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Sort by
              <select
                aria-label="Sort displayed projects requiring review"
                value={sort}
                onChange={(event) => setSort(event.target.value as PriorityProjectSort)}
                className="h-11 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="delay">Delay duration</option>
                <option value="budget">Allocated budget</option>
                <option value="region">Region</option>
                <option value="completion">Completion rate</option>
              </select>
            </label>
          )}
          <Link
            href="/admin-projects"
            className="text-[15px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            View all projects
          </Link>
        </div>
      </div>
      {projects.length === 0 ? (
        <p className="py-6 text-[15px] text-slate-600 dark:text-slate-300">No delayed or at-risk projects require intervention for the current filters.</p>
      ) : (
        <>
          <p className="border-b border-slate-100 py-2 text-sm text-slate-500 sm:hidden dark:border-slate-800 dark:text-slate-400">
            Swipe or use Shift plus mouse wheel to view all columns.
          </p>
          <div
            aria-label="Scrollable projects requiring review table"
            tabIndex={0}
            className="overflow-x-auto rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-800"
          >
          <table className="w-full min-w-[940px] border-collapse text-left text-[15px]">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Project</th>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Program / location</th>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Allocated budget</th>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Completion</th>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Target date</th>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Completion forecast</th>
                <th scope="col" className="bg-slate-50/80 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleProjects.map((project) => (
                <tr data-priority-project-row={project.projectId} key={project.projectId} className="align-top transition-colors duration-200 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3.5">
                    <Link href={`/projects/${encodeURIComponent(project.projectId)}`} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{project.projectName}</Link>
                    <p className="mt-1 max-w-xs font-mono text-sm text-slate-500 dark:text-slate-400">{project.projectId}</p>
                    <p className="mt-0.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">{project.projectType}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[15px] font-medium text-slate-800 dark:text-slate-100">{project.program}</p>
                    <p className="mt-1 max-w-[15rem] text-sm text-slate-500 dark:text-slate-400">{[project.province, project.region].filter(Boolean).join(", ") || "Unknown"}</p>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-[15px] text-slate-700 dark:text-slate-200">{project.allocatedBudget === null ? <span className="text-slate-500 dark:text-slate-400">Unknown</span> : formatDashboardCurrency(project.allocatedBudget)}</td>
                  <td className="px-4 py-3.5 tabular-nums text-[15px] font-medium text-slate-700 dark:text-slate-200">{project.physicalProgress === null ? <span className="text-slate-500 dark:text-slate-400">Unknown</span> : `${project.physicalProgress}%`}</td>
                  <td className="px-4 py-3.5 text-[15px] text-slate-700 dark:text-slate-200">{formatTargetDate(project.targetCompletionDate)}</td>
                  <td className="max-w-[13rem] px-4 py-3.5 text-[15px] text-slate-700 dark:text-slate-200">{formatForecast(project.forecast)}</td>
                  <td className="px-4 py-3.5">
                    <span className={
                      project.health === "delayed"
                        ? "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900"
                        : "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900"
                    }>
                      <span aria-hidden="true" className={project.health === "delayed" ? "size-1.5 rounded-full bg-red-500" : "size-1.5 rounded-full bg-amber-500"} />
                      {healthLabels[project.health]}
                    </span>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{project.reason}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}

function formatForecast(
  forecast: ManagerialDashboardData["priorityProjects"][number]["forecast"],
) {
  if (!forecast) return "Insufficient history";
  if (forecast.status === "insufficientHistory") return "Insufficient history";
  if (forecast.status === "stalled") return "Stalled: no projected date";
  if (forecast.status === "completed") return "Completed";
  if (forecast.status === "inactive") return "Inactive: no projection";
  const date = formatTargetDate(forecast.projectedCompletionDate);
  const confidence = forecast.confidence ? `${forecast.confidence} confidence` : "confidence unavailable";
  return `Projected completion: ${date} (${confidence})`;
}

function formatTargetDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}
