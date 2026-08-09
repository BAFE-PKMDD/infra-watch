"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { parseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { DataCoverage } from "./data-coverage";
import { DataFreshness } from "./data-freshness";
import { DashboardFilters, dashboardFiltersToSearchParams, mergeDashboardFilter } from "./dashboard-filters";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardState } from "./dashboard-state";
import { ExecutiveInsights } from "./executive-insights";
import { ExecutiveKpis } from "./executive-kpis";
import { ProgressVarianceChart } from "./progress-variance-chart";
import { PriorityProjectsTable } from "./priority-projects-table";
import { ProjectTypeBudgetChart } from "./project-type-budget-chart";
import { RegionalPerformanceChart } from "./regional-performance-chart";
import { ScheduleHealthChart } from "./schedule-health-chart";

export function ManagerialDashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => safeParseFilters(searchParams), [searchParams]);
  const query = useManagerialDashboard(filters);

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

  if (query.isPending) return <DashboardSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        <DashboardState state="error" />
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw /> Retry
        </Button>
      </div>
    );
  }

  const data = query.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DataFreshness freshness={data.freshness} />
        <div className="flex items-center gap-2">
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

function safeParseFilters(searchParams: ReadonlyURLSearchParamsLike) {
  try {
    return parseManagerialDashboardFilters(new URLSearchParams(searchParams.toString()));
  } catch {
    return {};
  }
}

type ReadonlyURLSearchParamsLike = { toString(): string };
