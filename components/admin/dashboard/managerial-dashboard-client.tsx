"use client";

import { FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { tryParseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { DataCoverage } from "./data-coverage";
import {
  buildDrillthroughSelection,
  DashboardDrillthroughDialog,
  type DrillthroughSelection,
} from "./dashboard-drillthrough-dialog";
import { DataFreshness } from "./data-freshness";
import { DelayedProjectsByRegionChart } from "./delayed-projects-by-region-chart";
import { DashboardFilters, dashboardFiltersToSearchParams, mergeDashboardFilter } from "./dashboard-filters";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardState } from "./dashboard-state";
import { ExecutiveInsights } from "./executive-insights";
import { ExecutiveKpis } from "./executive-kpis";
import { OptionalManagerialAiCopilot } from "./managerial-ai-copilot";
import { ProgressVarianceChart } from "./progress-variance-chart";
import { PriorityProjectsTable } from "./priority-projects-table";
import { ProjectTypeBudgetChart } from "./project-type-budget-chart";
import { RegionalPerformanceChart } from "./regional-performance-chart";
import { ScheduleHealthChart } from "./schedule-health-chart";

export function ManagerialDashboardClient({
  managerialAiEnabled = false,
}: {
  managerialAiEnabled?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedFilters = useMemo(
    () => tryParseManagerialDashboardFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const filters = parsedFilters ?? {};
  const query = useManagerialDashboard(filters, parsedFilters ? user?.id : undefined);
  const [drillthrough, setDrillthrough] = useState<DrillthroughSelection | null>(null);

  function updateFilters(next: ManagerialDashboardFilters) {
    setDrillthrough(null);
    const params = dashboardFiltersToSearchParams(next);
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  function applyPartialFilters(partial: Partial<ManagerialDashboardFilters>) {
    setDrillthrough(null);
    const next = { ...filters, ...partial };
    if (partial.region && partial.region !== filters.region) delete next.province;
    updateFilters(next);
  }

  if (!parsedFilters) {
    return (
      <div className="space-y-3">
        <DashboardState
          state="error"
          message="The dashboard URL contains an invalid filter. Reset the filters before loading analytics."
        />
        <Button variant="outline" onClick={() => updateFilters({})}>Reset invalid filters</Button>
      </div>
    );
  }
  if (query.isPending && !query.data) return <DashboardSkeleton />;
  if (!query.data) {
    return (
      <div className="space-y-3">
        <DashboardState
          state="error"
          message={query.error instanceof Error ? query.error.message : undefined}
        />
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw /> Retry
        </Button>
      </div>
    );
  }

  const data = query.data;
  const executiveBriefParams = dashboardFiltersToSearchParams(filters);
  const executiveBriefHref = executiveBriefParams.size > 0
    ? `/executive-brief?${executiveBriefParams.toString()}`
    : "/executive-brief";
  return (
    <div className="space-y-6" aria-busy={query.isFetching}>
      <div className="flex flex-col gap-3 border-y border-slate-200 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <DataFreshness freshness={data.freshness} asOf={data.asOf} />
        <div className="flex flex-wrap items-center gap-2">
          <OptionalManagerialAiCopilot
            enabled={managerialAiEnabled}
            filters={filters}
            asOf={data.asOf}
            onRefresh={() => query.refetch({ throwOnError: true })}
          />
          {managerialAiEnabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href={executiveBriefHref}>
                <FileText /> Executive Brief
              </Link>
            </Button>
          )}
          <Button variant="default" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {query.isRefetchError && <DashboardState state="refreshError" />}
      {query.isPlaceholderData && (
        <div role="status" aria-live="polite" className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Updating dashboard filters…
        </div>
      )}
      <DashboardFilters filters={filters} options={data.filterOptions} onChange={updateFilters} />

      {data.kpis.totalProjects === 0 ? (
        <DashboardState state="empty" />
      ) : (
        <>
          <ExecutiveKpis
            kpis={data.kpis}
            coverage={data.coverage}
            assessedProjects={data.scheduleHealth.reduce((total, entry) => entry.key === "notAssessed" ? total : total + entry.count, 0)}
          />
          <ExecutiveInsights insights={data.insights} onApplyFilter={applyPartialFilters} />
          <DataCoverage coverage={data.coverage} />
          <PriorityProjectsTable projects={data.priorityProjects} />

          <section aria-label="Primary portfolio charts" className="grid items-start gap-4 lg:grid-cols-2">
            <DelayedProjectsByRegionChart
              data={data.regions}
              onSelect={(region) => updateFilters(mergeDashboardFilter(filters, "region", region))}
              onDrillthrough={(region) => setDrillthrough(buildDrillthroughSelection(filters, { kind: "delayedRegion", region }))}
            />
            <ProjectTypeBudgetChart
              data={data.projectTypes}
              onSelect={(projectType) => updateFilters(mergeDashboardFilter(filters, "projectType", projectType))}
              onDrillthrough={(projectType, excludedProjectTypes) => setDrillthrough(buildDrillthroughSelection(filters, { kind: "projectType", projectType, excludedProjectTypes }))}
            />
          </section>

          <details className="group rounded-md border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="cursor-pointer list-none px-4 py-3 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
              <span className="inline-flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
                Detailed Analytics
              </span>
              <span className="ml-3 text-xs font-normal text-slate-500 dark:text-slate-400">Project timing, reported progress, and regional comparisons</span>
            </summary>
            <div className="grid items-start gap-4 border-t border-slate-200 p-4 lg:grid-cols-2 dark:border-slate-800">
              <ScheduleHealthChart
                data={data.scheduleHealth}
                onSelect={(health) => updateFilters(mergeDashboardFilter(filters, "health", health))}
                onDrillthrough={(health) => {
                  const label = { onTrack: "On schedule", atRisk: "At risk of delay", delayed: "Delayed", notAssessed: "Cannot be assessed" }[health];
                  setDrillthrough(buildDrillthroughSelection(filters, { kind: "schedule", health, label }));
                }}
              />
              <RegionalPerformanceChart
                data={data.regions}
                onSelect={(region) => updateFilters(mergeDashboardFilter(filters, "region", region))}
                onDrillthrough={(region, metric) => setDrillthrough(buildDrillthroughSelection(filters, { kind: "regionalMetric", region, metric }))}
              />
              {data.progressVariance.length > 0 && (
                <div className="lg:col-span-2">
                  <ProgressVarianceChart data={data.progressVariance} />
                </div>
              )}
            </div>
          </details>
        </>
      )}
      {drillthrough ? (
        <DashboardDrillthroughDialog
          key={`${drillthrough.title}-${JSON.stringify(drillthrough.filters)}`}
          selection={drillthrough}
          viewerKey={user?.id}
          onClose={() => setDrillthrough(null)}
        />
      ) : null}
    </div>
  );
}
