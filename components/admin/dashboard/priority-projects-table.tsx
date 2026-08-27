"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ManagerialDashboardData,
  ScheduleHealth,
} from "@/types/managerial-dashboard.types";
import { formatDashboardCurrency } from "./executive-kpis";

const healthLabels: Record<ScheduleHealth, string> = {
  onTrack: "On track",
  atRisk: "At risk",
  delayed: "Delayed",
  notAssessed: "Not assessed",
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
    <section aria-labelledby="priority-projects-heading" className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 id="priority-projects-heading" className="text-base font-semibold text-slate-950 dark:text-white">Priority Projects</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {sort === "delay" ? "Five projects requiring the most immediate review in the current scope." : "Five displayed priority projects sorted by the selected field."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {projects.length > 1 && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              Sort displayed projects by
              <select
                aria-label="Sort displayed priority projects"
                value={sort}
                onChange={(event) => setSort(event.target.value as PriorityProjectSort)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            View all projects
          </Link>
        </div>
      </div>
      {projects.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">No delayed or at-risk projects require intervention for the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-2.5">Project</th>
                <th scope="col" className="px-4 py-2.5">Program / location</th>
                <th scope="col" className="px-4 py-2.5">Allocated budget</th>
                <th scope="col" className="px-4 py-2.5">Completion</th>
                <th scope="col" className="px-4 py-2.5">Target date</th>
                <th scope="col" className="px-4 py-2.5">Completion forecast</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleProjects.map((project) => (
                <tr data-priority-project-row={project.projectId} key={project.projectId} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${encodeURIComponent(project.projectId)}`} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{project.projectName}</Link>
                    <p className="mt-1 max-w-xs text-xs font-mono text-slate-500 dark:text-slate-400">{project.projectId}</p>
                    <p className="mt-0.5 max-w-xs text-xs text-slate-400 dark:text-slate-500">{project.projectType}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{project.program}</p>
                    <p className="mt-1 max-w-[15rem] text-xs text-slate-500 dark:text-slate-400">{[project.province, project.region].filter(Boolean).join(", ") || "Unknown"}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-200">{project.allocatedBudget === null ? "Unknown" : formatDashboardCurrency(project.allocatedBudget)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-200">{project.physicalProgress === null ? "Unknown" : `${project.physicalProgress}%`}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatTargetDate(project.targetCompletionDate)}</td>
                  <td className="max-w-[13rem] px-4 py-3 text-slate-700 dark:text-slate-200">{formatForecast(project.forecast)}</td>
                  <td className="px-4 py-3">
                    <span className={project.health === "delayed" ? "inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200" : "inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200"}>{healthLabels[project.health]}</span>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{project.reason}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatForecast(
  forecast: ManagerialDashboardData["priorityProjects"][number]["forecast"],
) {
  if (!forecast) return "Insufficient history";
  if (forecast.status === "insufficientHistory") return "Insufficient history";
  if (forecast.status === "stalled") return "Stalled — no projected date";
  if (forecast.status === "completed") return "Completed";
  if (forecast.status === "inactive") return "Inactive — no projection";
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
