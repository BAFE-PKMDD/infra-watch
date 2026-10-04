"use client";

import { FileText, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { tryParseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import {
  buildDrillthroughSelection,
  DashboardDrillthroughDialog,
  type DrillthroughSelection,
} from "./dashboard-drillthrough-dialog";
import { CommonProjectTypesTable } from "./common-project-types-table";
import { CompletionDelayHistogram } from "./completion-delay-histogram";
import { ContractorTrackRecordTable } from "./contractor-track-record-table";
import { DataFreshness } from "./data-freshness";
import { DelayedProjectsByRegionChart } from "./delayed-projects-by-region-chart";
import { DashboardFilters, dashboardFiltersToSearchParams, mergeDashboardFilter } from "./dashboard-filters";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardState } from "./dashboard-state";
import { ExecutiveKpis } from "./executive-kpis";
import { FundingYearChart } from "./funding-year-chart";
import { LateDaysByDimensionChart } from "./late-days-by-dimension-chart";
import { LateRateByContractLengthChart } from "./late-rate-by-contract-length-chart";
import { LateRateByYearChart } from "./late-rate-by-year-chart";
import { OptionalManagerialAiCopilot } from "./managerial-ai-copilot";
import { NtpLagChart } from "./ntp-lag-chart";
import { OngoingByYearChart, OngoingOverdueBucketsChart } from "./ongoing-overdue-chart";
import { PriorityProjectsTable } from "./priority-projects-table";
import { ProcurementModeChart } from "./procurement-mode-chart";
import { ProgressCurveChart } from "./progress-curve-chart";
import { ProjectStatusFunnelChart } from "./project-status-funnel-chart";
import { ProjectTypeBudgetChart } from "./project-type-budget-chart";
import { RegionCategoryHeatTable } from "./region-category-heat-table";
import { RegionCostByTypeChart } from "./region-cost-by-type-chart";
import { RegionalPerformanceChart } from "./regional-performance-chart";
import { RegionTotalsChart } from "./region-totals-chart";
import { ScheduleHealthChart } from "./schedule-health-chart";
import { StatusByYearChart } from "./status-by-year-chart";
import { TurnoverBacklogChart } from "./turnover-backlog-chart";

// Leaflet touches browser globals at module load time, so this chart must never be part
// of the server render, not just deferred until mount.
const RegionMapChart = dynamic(
  () => import("./region-map-chart").then((mod) => mod.RegionMapChart),
  {
    ssr: false,
    loading: () => <ChartPanel title="Where are delayed projects concentrated?" description="Loading map…" summary="Loading map…"><ChartEmptyState title="Loading map…" /></ChartPanel>,
  },
);

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
    // A 403 means this viewer isn't allowed to see analytics at all (e.g. a moderator
    // with no region/agency scope assigned yet) — retrying won't change that, and the
    // sidebar already hides this link for them, so there's nothing useful to show here.
    const status = query.error instanceof Error ? (query.error as Error & { status?: number }).status : undefined;
    if (status === 403) return null;

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
    <div className="space-y-8" aria-busy={query.isFetching}>
      <div data-tour="dashboard-freshness" className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <DataFreshness freshness={data.freshness} asOf={data.asOf} />
        <div data-tour="dashboard-actions" className="flex flex-wrap items-center gap-2">
          <OptionalManagerialAiCopilot
            enabled={managerialAiEnabled}
            filters={filters}
            asOf={data.asOf}
            onRefresh={() => query.refetch({ throwOnError: true })}
          />
          {managerialAiEnabled && (
            <Button variant="outline" className="min-h-11 px-4 text-[15px]" asChild>
              <Link href={executiveBriefHref}>
                <FileText /> Executive Brief
              </Link>
            </Button>
          )}
          <Button variant="default" className="min-h-11 px-4 text-[15px] transition-transform active:scale-[0.98] motion-reduce:transition-none" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {query.isRefetchError && <DashboardState state="refreshError" />}
      {query.isPlaceholderData && (
        <div role="status" aria-live="polite" className="text-[15px] font-medium text-slate-600 dark:text-slate-300">
          Updating dashboard filters…
        </div>
      )}
      <DashboardFilters filters={filters} options={data.filterOptions} onChange={updateFilters} />

      {data.kpis.totalProjects === 0 ? (
        <DashboardState state="empty" />
      ) : (
        <>
          <div data-tour="dashboard-kpis">
            <ExecutiveKpis
              kpis={data.kpis}
              coverage={data.coverage}
              assessedProjects={data.scheduleHealth.reduce((total, entry) => entry.key === "notAssessed" ? total : total + entry.count, 0)}
            />
          </div>
          <div data-tour="dashboard-priority">
            <PriorityProjectsTable projects={data.priorityProjects} />
          </div>

          <div data-tour="dashboard-map">
            <RegionMapChart
              data={data.regions}
              onSelect={(region) => updateFilters(mergeDashboardFilter(filters, "region", region))}
            />
          </div>

          <section data-tour="dashboard-charts" aria-label="Primary charts" className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both delay-300 duration-500 grid items-start gap-4 motion-reduce:animate-none lg:grid-cols-2">
            <DelayedProjectsByRegionChart
              data={data.regions}
              filters={filters}
              viewerKey={user?.id}
              onDrillthrough={(region, province) => setDrillthrough(buildDrillthroughSelection(filters, { kind: "delayedRegion", region, province }))}
            />
            <ProjectTypeBudgetChart
              data={data.projectTypes}
              filters={filters}
              viewerKey={user?.id}
              onDrillthrough={(projectType, options) => setDrillthrough(buildDrillthroughSelection(filters, { kind: "projectType", projectType, excludedProjectTypes: options?.excludedProjectTypes, program: options?.program }))}
            />
          </section>

          <details data-tour="dashboard-schedule" className="group animate-in fade-in slide-in-from-bottom-1 fill-mode-both delay-500 duration-500 rounded-md border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer list-none px-4 py-3.5 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
                <span className="text-base font-semibold text-slate-950 dark:text-white">Schedule and progress</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Project timing, reported progress, and regional comparisons</span>
              </span>
            </summary>
            <div className="grid items-start gap-4 border-t border-slate-100 p-4 lg:grid-cols-2 dark:border-slate-800">
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
              <div className="lg:col-span-2">
                <FundingYearChart
                  data={data.fundingYears}
                  onSelect={(yearFunded) => updateFilters(mergeDashboardFilter(filters, "year", yearFunded))}
                />
              </div>
              <div className="lg:col-span-2">
                <StatusByYearChart data={data.statusByYear} />
              </div>
            </div>
          </details>

          <details data-tour="dashboard-portfolio" className="group animate-in fade-in slide-in-from-bottom-1 fill-mode-both delay-700 duration-500 rounded-md border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer list-none px-4 py-3.5 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
                <span className="text-base font-semibold text-slate-950 dark:text-white">Where projects stand</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Project stages, spread across regions, and what gets built, by facility type</span>
              </span>
            </summary>
            <div className="grid items-start gap-4 border-t border-slate-100 p-4 dark:border-slate-800">
              <ProjectStatusFunnelChart data={data.statusBreakdown} />
              <RegionTotalsChart data={data.regions} />
              <RegionCategoryHeatTable data={data.regionCategories} />
              <CommonProjectTypesTable data={data.commonProjectTypes} />
            </div>
          </details>

          <details data-tour="dashboard-delivery" className="group animate-in fade-in slide-in-from-bottom-1 fill-mode-both delay-700 duration-500 rounded-md border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer list-none px-4 py-3.5 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
                <span className="text-base font-semibold text-slate-950 dark:text-white">Delivery and delay analytics</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Procurement, schedule performance, contractors, and turn-over</span>
              </span>
            </summary>
            <div className="grid items-start gap-4 border-t border-slate-100 p-4 dark:border-slate-800">
              <ProcurementModeChart data={data.procurementModes} />
              <RegionCostByTypeChart
                projectTypes={data.projectTypes}
                filters={filters}
                viewerKey={user?.id}
              />
              <CompletionDelayHistogram data={data.completionDelayBuckets} />
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <LateDaysByDimensionChart data={data.lateDaysByRegion} dimensionLabel="region" />
                <LateDaysByDimensionChart data={data.lateDaysByProjectType} dimensionLabel="type of facility" />
              </div>
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <LateRateByContractLengthChart data={data.lateRateByContractLength} />
                <LateRateByYearChart data={data.lateRateByYear} />
              </div>
              <NtpLagChart data={data.ntpLagByProcurementMode} />
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <OngoingOverdueBucketsChart data={data.ongoingOverdueBuckets} />
                <OngoingByYearChart data={data.ongoingByYear} />
              </div>
              <TurnoverBacklogChart data={data.turnoverBacklog} />
              <ContractorTrackRecordTable data={data.contractors} />
              <ProgressCurveChart progressVariance={data.progressVariance} viewerKey={user?.id} />
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
