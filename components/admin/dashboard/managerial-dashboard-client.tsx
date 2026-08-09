"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { parseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { DashboardFilters, dashboardFiltersToSearchParams } from "./dashboard-filters";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardState } from "./dashboard-state";

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
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-white">Data as of </span>
          {data.freshness.lastSuccessfulSyncAt
            ? new Intl.DateTimeFormat("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Manila",
              }).format(new Date(data.freshness.lastSuccessfulSyncAt))
            : "Never synced"}
        </div>
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
        <section aria-label="Dashboard analytics" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Portfolio analytics loaded for {data.kpis.totalProjects.toLocaleString("en-PH")} projects.
        </section>
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
