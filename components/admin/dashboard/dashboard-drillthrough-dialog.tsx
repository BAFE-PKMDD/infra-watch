"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchDashboardDrillthrough,
  useDashboardDrillthrough,
  type DashboardDrillthroughOptions,
} from "@/hooks/use-dashboard-drillthrough";
import type {
  ManagerialDashboardDrillthroughData,
  ManagerialDashboardDrillthroughProject,
  ManagerialDashboardFilters,
  ProjectStatusFilter,
  ScheduleHealth,
} from "@/types/managerial-dashboard.types";
import { formatDashboardCurrency } from "./executive-kpis";

export type DrillthroughSelection = {
  title: string;
  description: string;
  filters: ManagerialDashboardFilters;
  options?: DashboardDrillthroughOptions;
};

type ChartSelection =
  | { kind: "schedule"; health: ScheduleHealth; label: string }
  | { kind: "delayedRegion"; region: string }
  | { kind: "projectType"; projectType: string; excludedProjectTypes?: string[] }
  | { kind: "regionalMetric"; region: string; metric: "completed" | "delayed" | "atRisk" };

export function buildDrillthroughSelection(
  activeFilters: ManagerialDashboardFilters,
  selection: ChartSelection,
): DrillthroughSelection {
  if (selection.kind === "schedule") {
    return {
      title: `${selection.label} projects`,
      description: `Projects classified as ${selection.label.toLowerCase()} under the current dashboard filters.`,
      filters: { ...activeFilters, health: selection.health },
    };
  }
  if (selection.kind === "projectType") {
    if (selection.projectType === "Other" && selection.excludedProjectTypes?.length) {
      return {
        title: "Projects in smaller project types",
        description: "Projects represented by the combined Other budget-allocation bar under the current dashboard filters.",
        filters: { ...activeFilters },
        options: { otherProjectTypes: { excluded: selection.excludedProjectTypes } },
      };
    }
    return {
      title: `${selection.projectType} projects`,
      description: `Projects included in the ${selection.projectType} budget-allocation bar under the current dashboard filters.`,
      filters: { ...activeFilters, projectType: selection.projectType },
    };
  }

  const filters = { ...activeFilters, region: selection.region };
  if (selection.region !== activeFilters.region) delete filters.province;
  if (selection.kind === "delayedRegion") {
    return {
      title: `Delayed projects in ${selection.region}`,
      description: "Projects classified as delayed in the selected region under the current dashboard filters.",
      filters: { ...filters, health: "delayed" },
    };
  }

  const metric = {
    completed: { title: "Completed", filter: { status: "completed" as ProjectStatusFilter } },
    delayed: { title: "Delayed", filter: { health: "delayed" as ScheduleHealth } },
    atRisk: { title: "At-risk", filter: { health: "atRisk" as ScheduleHealth } },
  }[selection.metric];
  return {
    title: `${metric.title} projects in ${selection.region}`,
    description: `Projects represented by the ${metric.title.toLowerCase()} value for the selected region.`,
    filters: { ...filters, ...metric.filter },
  };
}

const healthLabels: Record<ScheduleHealth, string> = {
  onTrack: "On schedule",
  atRisk: "At risk of delay",
  delayed: "Delayed",
  notAssessed: "Cannot be assessed",
};

const filterLabels: Record<keyof ManagerialDashboardFilters, string> = {
  program: "Program",
  year: "Funding year",
  region: "Region",
  province: "Province",
  projectType: "Project type",
  status: "Project status",
  health: "Schedule status",
};

function formatPercent(value: number | null) {
  return value === null ? "Unknown" : `${value.toFixed(1)}%`;
}

function formatDifference(value: number | null) {
  if (value === null) return "Cannot be assessed";
  if (value > 0) return `${value.toFixed(1)} percentage points ahead`;
  if (value < 0) return `${Math.abs(value).toFixed(1)} percentage points behind`;
  return "At expected pace";
}

function getExpectedTooltip(value: number | null) {
  if (value === null) return "Target today cannot be calculated (project may be delayed, completed, or missing NTP/duration dates).";
  return `Based on contract duration, the project should be ${value.toFixed(1)}% complete as of today.`;
}

function getDifferenceTooltip(value: number | null) {
  if (value === null) return "Schedule gap cannot be calculated because target progress or actual progress is unavailable.";
  if (value > 0) return `The project is ${value.toFixed(1)} percentage points ahead of its planned schedule.`;
  if (value < 0) return `The project is ${Math.abs(value).toFixed(1)} percentage points behind its planned schedule.`;
  return "The project is exactly on pace with its planned schedule.";
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(value))
    : "Unknown";
}

function formatShortDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(value))
    : null;
}

export function DashboardDrillthroughResults({
  data,
  filters,
  allProjects,
  hasMore,
  loadingMore,
  sentinelRef,
}: {
  data: ManagerialDashboardDrillthroughData;
  filters: ManagerialDashboardFilters;
  allProjects: ManagerialDashboardDrillthroughProject[];
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef: React.RefCallback<HTMLDivElement>;
}) {
  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {data.total.toLocaleString("en-PH")} projects represented by this value
        </p>
        <div aria-label="Active dashboard and chart filters" className="flex flex-wrap gap-x-4 gap-y-1 border-y border-slate-200 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          {Object.entries(filters).map(([key, value]) => (
            <span key={key}><strong>{filterLabels[key as keyof ManagerialDashboardFilters]}:</strong> {key === "health" ? healthLabels[value as ScheduleHealth] : value}</span>
          ))}
        </div>

        {allProjects.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            No projects match this chart value and the active dashboard filters.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="min-w-[1150px] w-full border-collapse text-left text-sm">
              <caption className="sr-only">Projects represented by the selected dashboard chart value</caption>
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2" scope="col">Project</th>
                  <th className="px-3 py-2" scope="col">Location</th>
                  <th className="px-3 py-2" scope="col">Type</th>
                  <th className="px-3 py-2" scope="col">Project status</th>
                  <th className="px-3 py-2" scope="col">Schedule status</th>
                  <th className="px-3 py-2 text-right" scope="col">Allocated budget</th>
                  <th className="px-3 py-2 text-right" scope="col">
                    <div className="inline-flex items-center justify-end gap-1">
                      <span>Actual Progress</span>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <Info className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          Actual physical work reported based on Program of Work (POW) items.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-right" scope="col">
                    <div className="inline-flex items-center justify-end gap-1">
                      <span>Target Today</span>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <Info className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          Target progress the project should have reached as of today, based on contract duration.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-3 py-2" scope="col">
                    <div className="inline-flex items-center gap-1">
                      <span>Schedule Gap</span>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <Info className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          Difference between Actual Progress and Target Today. Shows whether the project is ahead of or behind schedule.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="px-3 py-2" scope="col">Target completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {allProjects.map((project) => (
                  <tr key={project.projectId} className="align-top hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-3 py-2">
                      <Link className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={`/projects/${encodeURIComponent(project.projectId)}`}>
                        {project.projectName}
                      </Link>
                      <span className="mt-0.5 block text-xs text-slate-500">{project.projectId}</span>
                      <span className="block text-xs text-slate-400">{project.program}</span>
                    </td>
                    <td className="px-3 py-2">{[project.province, project.region].filter(Boolean).join(", ") || "Unknown"}</td>
                    <td className="px-3 py-2">{project.projectType}</td>
                    <td className="px-3 py-2 capitalize">{project.status}</td>
                    <td className="px-3 py-2">{healthLabels[project.health]}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{project.allocatedBudget === null ? "Unavailable" : formatDashboardCurrency(project.allocatedBudget)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" title={project.physicalProgress !== null ? `Actual progress reported: ${project.physicalProgress}%` : "Physical progress unavailable"}>
                      {formatPercent(project.physicalProgress)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums cursor-help" title={getExpectedTooltip(project.expectedProgress)}>
                      {formatPercent(project.expectedProgress)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap cursor-help" title={getDifferenceTooltip(project.variance)}>
                      {formatDifference(project.variance)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(project.targetCompletionDate)}
                      <span className="mt-0.5 block text-[10px] leading-tight text-slate-400 dark:text-slate-500">
                        {project.ntpDate
                          ? `NTP: ${formatShortDate(project.ntpDate)}`
                          : "NTP: —"}
                        {" · "}
                        {project.calendarDays !== null
                          ? `${project.calendarDays} CD`
                          : "CD: —"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-4 text-xs text-slate-500 dark:text-slate-400">
                {loadingMore ? "Loading more…" : "Scroll for more"}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing {allProjects.length.toLocaleString("en-PH")} of {data.total.toLocaleString("en-PH")} projects
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DashboardDrillthroughDialog({
  selection,
  viewerKey,
  onClose,
}: {
  selection: DrillthroughSelection;
  viewerKey: string | undefined;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [additionalProjects, setAdditionalProjects] = useState<ManagerialDashboardDrillthroughProject[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [latestData, setLatestData] = useState<ManagerialDashboardDrillthroughData | null>(null);
  const loadingRef = useRef(false);

  const query = useDashboardDrillthrough(selection.filters, viewerKey, 1, true, selection.options);
  const currentData = latestData ?? query.data ?? null;
  const accumulated = query.data
    ? [...query.data.projects, ...additionalProjects]
    : [];
  const totalPages = currentData ? Math.max(1, Math.ceil(currentData.total / currentData.pageSize)) : 1;
  const hasMore = page < totalPages;

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const nextData = await fetchDashboardDrillthrough(selection.filters, nextPage, undefined, selection.options);
      setAdditionalProjects((current) => [...current, ...nextData.projects]);
      setLatestData(nextData);
      setPage(nextPage);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [page, hasMore, selection.filters, selection.options]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) loadNextPage();
        },
        { rootMargin: "100px" },
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [loadNextPage],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{selection.title}</DialogTitle>
          <DialogDescription>{selection.description} Select a project name to open its full record.</DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <div role="status" className="py-12 text-center text-sm text-slate-600 dark:text-slate-300">Loading project details…</div>
        ) : query.error || !query.data ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {query.error instanceof Error ? query.error.message : "Project details are unavailable."}
          </div>
        ) : (
          <DashboardDrillthroughResults
            data={currentData ?? query.data}
            filters={selection.filters}
            allProjects={accumulated}
            hasMore={hasMore}
            loadingMore={loadingMore}
            sentinelRef={sentinelRef}
          />
        )}
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
