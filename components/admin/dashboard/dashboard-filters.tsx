"use client";

import type { ChangeEvent } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ManagerialDashboardData,
  ManagerialDashboardFilters,
  ProjectStatusFilter,
  ScheduleHealth,
} from "@/types/managerial-dashboard.types";

const FILTER_ORDER: Array<keyof ManagerialDashboardFilters> = [
  "program",
  "year",
  "region",
  "province",
  "projectType",
  "status",
  "health",
];

const FILTER_LABELS: Record<keyof ManagerialDashboardFilters, string> = {
  program: "Program",
  year: "Funding year",
  region: "Region",
  province: "Province",
  projectType: "Project type",
  status: "Project status",
  health: "Schedule health",
};

export function dashboardFiltersToSearchParams(
  filters: ManagerialDashboardFilters,
) {
  const params = new URLSearchParams();
  for (const key of FILTER_ORDER) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function mergeDashboardFilter<K extends keyof ManagerialDashboardFilters>(
  filters: ManagerialDashboardFilters,
  key: K,
  value: ManagerialDashboardFilters[K] | "all",
): ManagerialDashboardFilters {
  const next = { ...filters };
  if (!value || value === "all") delete next[key];
  else next[key] = value as ManagerialDashboardFilters[K];
  if (key === "region" && value !== filters.region) delete next.province;
  return Object.fromEntries(
    FILTER_ORDER.flatMap((filterKey) =>
      next[filterKey] ? [[filterKey, next[filterKey]]] : [],
    ),
  ) as ManagerialDashboardFilters;
}

export function resetDashboardFilters(): ManagerialDashboardFilters {
  return {};
}

type DashboardFiltersProps = {
  filters: ManagerialDashboardFilters;
  options: ManagerialDashboardData["filterOptions"];
  onChange: (filters: ManagerialDashboardFilters) => void;
};

export function DashboardFilters({ filters, options, onChange }: DashboardFiltersProps) {
  const activeFilters = FILTER_ORDER.flatMap((key) => {
    const value = filters[key];
    return value ? [{ key, value }] : [];
  });
  const update =
    <K extends keyof ManagerialDashboardFilters>(key: K) =>
    (event: ChangeEvent<HTMLSelectElement>) =>
      onChange(
        mergeDashboardFilter(
          filters,
          key,
          event.target.value as ManagerialDashboardFilters[K] | "all",
        ),
      );

  return (
    <section
      aria-label="Dashboard filters"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">Portfolio scope</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">All indicators and drill-downs use the same authorized filter scope.</p>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {activeFilters.length === 0 ? "No active filters" : `${activeFilters.length} active ${activeFilters.length === 1 ? "filter" : "filters"}`}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Filter label="Program" value={filters.program} options={options.programs} onChange={update("program")} />
        <Filter label="Funding year" value={filters.year} options={options.years} onChange={update("year")} />
        <Filter label="Region" value={filters.region} options={options.regions} onChange={update("region")} />
        <Filter
          label="Province"
          value={filters.province}
          options={options.provinces}
          onChange={update("province")}
          disabled={!filters.region && options.provinces.length === 0}
        />
        <Filter label="Project type" value={filters.projectType} options={options.projectTypes} onChange={update("projectType")} />
        <Filter
          label="Project status"
          value={filters.status}
          options={options.statuses}
          onChange={update("status")}
          format={formatStatus}
        />
        <Filter
          label="Schedule health"
          value={filters.health}
          options={["onTrack", "atRisk", "delayed", "notAssessed"] satisfies ScheduleHealth[]}
          onChange={update("health")}
          format={formatHealth}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex flex-wrap gap-2" aria-label="Active dashboard filters">
          {activeFilters.map(({ key, value }) => (
            <button
              key={key}
              type="button"
              aria-label={`Remove ${FILTER_LABELS[key]} filter`}
              onClick={() => onChange(mergeDashboardFilter(filters, key, "all"))}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {FILTER_LABELS[key]}: {key === "status" ? formatStatus(value) : key === "health" ? formatHealth(value) : value}
              <X className="size-3" aria-hidden="true" />
            </button>
          ))}
          {activeFilters.length === 0 && <span className="text-xs text-slate-500 dark:text-slate-400">Showing the full authorized portfolio</span>}
        </div>
        <Button variant="outline" onClick={() => onChange(resetDashboardFilters())} disabled={Object.keys(filters).length === 0}>
          Reset filters
        </Button>
      </div>
    </section>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
  disabled,
  format = (option) => option,
}: {
  label: string;
  value?: string;
  options: readonly string[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  format?: (option: string) => string;
}) {
  const id = `dashboard-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
      {label}
      <select
        id={id}
        value={value ?? "all"}
        onChange={onChange}
        disabled={disabled}
        className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatStatus(status: string) {
  const labels: Record<ProjectStatusFilter, string> = {
    planned: "Not yet started",
    ongoing: "Ongoing",
    completed: "Completed",
    suspended: "Suspended",
  };
  return labels[status as ProjectStatusFilter] ?? status;
}

function formatHealth(health: string) {
  return ({
    onTrack: "On track",
    atRisk: "At risk",
    delayed: "Delayed",
    notAssessed: "Not assessed",
  } as Record<string, string>)[health] ?? health;
}
