"use client";

import { FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { tryParseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { DataCoverage } from "./data-coverage";
import { DataFreshness } from "./data-freshness";
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

  function updateFilters(next: ManagerialDashboardFilters) {
    const params = dashboardFiltersToSearchParams(next);
    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  function applyPartialFilters(partial: Partial<ManagerialDashboardFilters>) {
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
    <div className="space-y-5" aria-busy={query.isFetching}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DataFreshness freshness={data.freshness} />
        <div className="flex flex-wrap items-center gap-2">
          <OptionalManagerialAiCopilot
            enabled={managerialAiEnabled}
            filters={filters}
            asOf={data.asOf}
            onRefresh={() => query.refetch({ throwOnError: true })}
          />
          {managerialAiEnabled && (
            <Button variant="outline" asChild>
              <Link href={executiveBriefHref}>
                <FileText /> Executive brief
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
            Refresh
          </Button>
          <Button variant="link" asChild>
            <Link href="/sync">ABEMIS Sync</Link>
          </Button>
        </div>
      </div>

      {data.freshness.isStale && <DashboardState state="stale" />}
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
          <ExecutiveKpis kpis={data.kpis} coverage={data.coverage} />
          <ExecutiveInsights insights={data.insights} onApplyFilter={applyPartialFilters} />
          <DataCoverage coverage={data.coverage} />
          <section aria-label="Portfolio analytics" className="grid gap-4 lg:grid-cols-2">
            <ScheduleHealthChart data={data.scheduleHealth} onSelect={(health) => updateFilters(mergeDashboardFilter(filters, "health", health))} />
            <ProjectTypeBudgetChart data={data.projectTypes} onSelect={(projectType) => updateFilters(mergeDashboardFilter(filters, "projectType", projectType))} />
            <RegionalPerformanceChart data={data.regions} onSelect={(region) => updateFilters(mergeDashboardFilter(filters, "region", region))} />
            <ProgressVarianceChart data={data.progressVariance} />
          </section>
          <PriorityProjectsTable projects={data.priorityProjects} />
        </>
      )}
    </div>
  );
}
