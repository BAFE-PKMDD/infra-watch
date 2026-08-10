import Link from "next/link";

import type { ManagerialDashboardData, ScheduleHealth } from "@/types/managerial-dashboard.types";
import { formatDashboardCurrency } from "./executive-kpis";

const healthLabels: Record<ScheduleHealth, string> = {
  onTrack: "On track",
  atRisk: "At risk",
  delayed: "Delayed",
  notAssessed: "Not assessed",
};

export function PriorityProjectsTable({ projects }: { projects: ManagerialDashboardData["priorityProjects"] }) {
  return (
    <section aria-labelledby="priority-projects-heading" className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 id="priority-projects-heading" className="text-base font-extrabold text-slate-950 dark:text-white">Priority projects</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Top delayed and at-risk projects ranked on the server by severity, schedule deficit, and allocated budget.</p>
      </div>
      {projects.length === 0 ? (
        <p className="p-6 text-sm text-slate-600 dark:text-slate-300">No delayed or at-risk projects require intervention for the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Project</th>
                <th scope="col" className="px-4 py-3">Program / location</th>
                <th scope="col" className="px-4 py-3">Allocated budget</th>
                <th scope="col" className="px-4 py-3">Physical progress</th>
                <th scope="col" className="px-4 py-3">Target date</th>
                <th scope="col" className="px-4 py-3">Completion forecast</th>
                <th scope="col" className="px-4 py-3">Schedule health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((project) => (
                <tr key={project.projectId} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${encodeURIComponent(project.projectId)}`} className="font-extrabold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{project.projectName}</Link>
                    <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">{project.projectType}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{project.program}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{[project.province, project.region].filter(Boolean).join(", ") || "Unknown"}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-200">{project.allocatedBudget === null ? "Unknown" : formatDashboardCurrency(project.allocatedBudget)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-200">{project.physicalProgress === null ? "Unknown" : `${project.physicalProgress}%`}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatTargetDate(project.targetCompletionDate)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatForecast(project.forecast)}</td>
                  <td className="px-4 py-3">
                    <span className={project.health === "delayed" ? "inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-extrabold text-red-800 dark:bg-red-950 dark:text-red-200" : "inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-200"}>{healthLabels[project.health]}</span>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{project.reason}</p>
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
