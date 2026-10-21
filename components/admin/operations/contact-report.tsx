"use client";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { getContactSlaReport } from "@/actions/query/reports.query";
import { ReportDateFilter } from "@/components/reports/report-date-filter";
import { ReportDownloadButton } from "@/components/reports/report-download-button";
import { SlaSummaryCards } from "@/components/reports/sla-summary-cards";
import { SlaDataTable } from "@/components/reports/sla-data-table";
import { OperationError } from "./shared";
const ResponseChart = dynamic(
  () =>
    import("@/components/reports/sla-response-chart").then(
      (module) => module.SlaResponseChart,
    ),
  { ssr: false },
);
const DistributionChart = dynamic(
  () =>
    import("@/components/reports/sla-distribution-chart").then(
      (module) => module.SlaDistributionChart,
    ),
  { ssr: false },
);
export function ContactReport({ userId }: { userId: string }) {
  const search = useSearchParams();
  const from = search.get("from");
  const to = search.get("to");
  const query = useQuery({
    queryKey: ["contact-sla-report", userId, from, to],
    queryFn: () => getContactSlaReport({ from, to }),
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ReportDateFilter />
        {query.data && (
          <ReportDownloadButton
            moduleName="Contact"
            data={query.data.tableData}
          />
        )}
      </div>
      <OperationError error={query.error} />
      {query.isPending && (
        <p role="status">Calculating contact response times…</p>
      )}
      {query.data && (
        <>
          <SlaSummaryCards
            summary={query.data.summary}
            title="Contact response performance"
          />
          <p className="text-sm text-muted-foreground">
            Response time ends at the first successfully sent staff reply.
            Failed deliveries and automated receipts are excluded. Pending
            inquiries can breach the 72-hour response target.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <ResponseChart
              data={query.data.trend}
              title="Staff response time by submission date"
              description="Average hours to the first delivered staff reply"
            />
            <DistributionChart
              data={query.data.distribution}
              title="Response-time distribution"
              description="Successfully answered inquiries by elapsed time"
            />
          </div>
          <SlaDataTable data={query.data.tableData} />
        </>
      )}
    </div>
  );
}
