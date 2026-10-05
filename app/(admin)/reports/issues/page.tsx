"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { getIssueSlaReport } from "@/actions/query/reports.query";
import { ReportDateFilter } from "@/components/reports/report-date-filter";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { SlaDataTable } from "@/components/reports/sla-data-table";
import { SlaSummaryCards } from "@/components/reports/sla-summary-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { getReportPreset, parseReportRange } from "@/lib/reports/date-range";

const SlaResponseChart = dynamic(
  () => import("@/components/reports/sla-response-chart").then((mod) => mod.SlaResponseChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> },
);

const SlaDistributionChart = dynamic(
  () => import("@/components/reports/sla-distribution-chart").then((mod) => mod.SlaDistributionChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> },
);

function IssuesReportContent() {
  const searchParams = useSearchParams();
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const { from, to } = useMemo(
    () => {
      try {
        return parseReportRange({ from: fromStr, to: toStr });
      } catch {
        const defaults = getReportPreset(30);
        return { from: fromStr || defaults.from, to: toStr || defaults.to };
      }
    },
    [fromStr, toStr],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["issue-sla-report", from, to],
    queryFn: () => getIssueSlaReport({ from, to }),
  });

  return (
    <AdminPageWrapper
      title="Issue Response Reports"
      description="Time to a first public staff response and issue resolution. Automated acceptance messages are excluded from response times."
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Issue Reports" }]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
          <ReportDateFilter />
          {data && <div data-tour="report-download"><ReportDownloadButton data={data.tableData} moduleName="Issues" /></div>}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-[400px] w-full" />
              <Skeleton className="h-[400px] w-full" />
            </div>
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 py-20 dark:border-red-900/20 dark:bg-red-900/10">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-red-900 dark:text-red-400">Unable to generate report</h2>
            <p className="mt-1 text-red-600 dark:text-red-500">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        ) : data ? (
          <>
            <div data-tour="report-summary"><SlaSummaryCards summary={data.summary} title="Issue response SLA performance" /></div>

            <div className="grid gap-6 md:grid-cols-2">
              <SlaResponseChart data={data.trend} title="Response time trend" description="Average hours to first public response (daily)" />
              <SlaDistributionChart data={data.distribution} title="Response time distribution" description="Frequency of first responses across SLA tiers" />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                Detailed issue data
              </h3>
              <SlaDataTable data={data.tableData} />
            </div>
          </>
        ) : null}
      </div>
    </AdminPageWrapper>
  );
}

export default function IssuesReportPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <IssuesReportContent />
    </Suspense>
  );
}
