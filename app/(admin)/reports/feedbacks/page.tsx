"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { getFeedbackSlaReport } from "@/actions/query/reports.query";
import { ReportDateFilter } from "@/components/reports/report-date-filter";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { SlaDataTable } from "@/components/reports/sla-data-table";
import { SlaSummaryCards } from "@/components/reports/sla-summary-cards";
import { Skeleton } from "@/components/ui/skeleton";

const SlaResponseChart = dynamic(
  () => import("@/components/reports/sla-response-chart").then((mod) => mod.SlaResponseChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> },
);

const SlaDistributionChart = dynamic(
  () => import("@/components/reports/sla-distribution-chart").then((mod) => mod.SlaDistributionChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-lg" /> },
);

function FeedbacksReportContent() {
  const searchParams = useSearchParams();
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const { from, to } = useMemo(
    () => ({
      from: fromStr || subDays(new Date(), 30).toISOString(),
      to: toStr || new Date().toISOString(),
    }),
    [fromStr, toStr],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["feedback-sla-report", from, to],
    queryFn: () => getFeedbackSlaReport({ from: new Date(from), to: new Date(to) }),
  });

  return (
    <AdminPageWrapper
      title="Feedback Moderation Reports"
      description="Analytics for how quickly citizen feedback gets a moderation decision. The automatic acknowledgment sent after submission is not counted as a response."
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Feedback Reports" }]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
          <ReportDateFilter />
          {data && <div data-tour="report-download"><ReportDownloadButton data={data.tableData} moduleName="Feedback" /></div>}
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
            <div data-tour="report-summary"><SlaSummaryCards summary={data.summary} title="Feedback moderation SLA performance" /></div>

            <div className="grid gap-6 md:grid-cols-2">
              <SlaResponseChart data={data.trend} title="Moderation time trend" description="Average hours to moderate feedback (daily)" />
              <SlaDistributionChart data={data.distribution} title="Moderation time distribution" description="Frequency of moderation actions across SLA tiers" />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                Detailed feedback data
              </h3>
              <SlaDataTable data={data.tableData} />
            </div>
          </>
        ) : null}
      </div>
    </AdminPageWrapper>
  );
}

export default function FeedbacksReportPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <FeedbacksReportContent />
    </Suspense>
  );
}
