import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FolderKanban,
  Gauge,
} from "lucide-react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { KpiCard } from "./kpi-card";

const dashboardCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const dashboardCompactCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 2,
});
const dashboardCountFormatter = new Intl.NumberFormat("en-PH");

export function formatDashboardCurrency(value: number) {
  return dashboardCurrencyFormatter.format(value);
}

export function formatDashboardCompactCurrency(value: number) {
  return dashboardCompactCurrencyFormatter.format(value);
}

export function formatDashboardPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatDashboardCount(value: number) {
  return dashboardCountFormatter.format(value);
}

export function ExecutiveKpis({
  kpis,
  coverage,
  assessedProjects,
}: {
  kpis: ManagerialDashboardData["kpis"];
  coverage: ManagerialDashboardData["coverage"];
  assessedProjects: number;
}) {
  const budgetCoverage = coverage.total > 0 ? (coverage.withBudget / coverage.total) * 100 : 0;
  const abcCoverage = coverage.total > 0 ? (coverage.withActualBidAmount / coverage.total) * 100 : 0;
  const scheduleAssessable = coverage.withSchedule > 0;
  const delayedValue = !scheduleAssessable
    ? "Not assessable"
    : kpis.delayedProjects === 0 && coverage.withSchedule < coverage.total
      ? "No confirmed delays"
      : formatDashboardCount(kpis.delayedProjects);
  const delayedDetail = scheduleAssessable
    ? `${formatDashboardCount(coverage.withSchedule)} of ${formatDashboardCount(coverage.total)} projects have schedule data.`
    : `0 of ${formatDashboardCount(coverage.total)} projects have schedule dates.`;
  const majorityAssessed = coverage.total > 0 && assessedProjects >= coverage.total / 2;
  const assessedDetail = `${formatDashboardCount(assessedProjects)} of ${formatDashboardCount(coverage.total)}`;

  let atRiskValue: string;
  let atRiskDetail: string;
  if (assessedProjects === 0) {
    atRiskValue = "Not assessable";
    atRiskDetail = `0 of ${formatDashboardCount(coverage.total)} projects have sufficient data.`;
  } else if (kpis.atRiskProjects > 0) {
    atRiskValue = `${formatDashboardCount(kpis.atRiskProjects)} confirmed`;
    atRiskDetail = `${formatDashboardCount(kpis.atRiskProjects)} confirmed among ${assessedDetail} assessed projects.`;
  } else if (!majorityAssessed) {
    atRiskValue = "At-risk assessment unavailable";
    atRiskDetail = `Only ${assessedDetail} projects have sufficient data.`;
  } else {
    atRiskValue = formatDashboardCount(kpis.atRiskProjects);
    atRiskDetail = `${assessedDetail} projects were assessed.`;
  }

  return (
    <section aria-labelledby="executive-kpis-heading">
      <h2 id="executive-kpis-heading" className="sr-only">Project overview</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Projects"
          value={formatDashboardCount(kpis.totalProjects)}
          definition="Count of projects in the signed-in user’s authorized scope after dashboard filters."
          detail="Projects in the current authorized scope"
          icon={<FolderKanban className="size-4" />}
        />
        <KpiCard
          label="Allocated Budget"
          value={coverage.withBudget === 0 ? "Unavailable" : formatDashboardCompactCurrency(kpis.allocatedBudget)}
          valueTitle={coverage.withBudget === 0 ? undefined : formatDashboardCurrency(kpis.allocatedBudget)}
          definition="Sum of non-null ABEMIS allocated amounts. Allocated amount is the approved project budget."
          detail={`${formatDashboardPercentage(budgetCoverage)} budget coverage`}
          icon={<Banknote className="size-4" />}
        />
        <KpiCard
          label="Completion Rate"
          value={formatDashboardPercentage(kpis.completionRate)}
          definition="Canonically completed projects divided by all status-assessed projects in scope."
          detail="Completed projects in the current scope"
          icon={<CheckCircle2 className="size-4" />}
        />
        <KpiCard
          label="Delayed Projects"
          value={delayedValue}
          definition="Incomplete projects whose target completion date is before the dashboard as-of date."
          detail={delayedDetail}
          tone={scheduleAssessable && kpis.delayedProjects > 0 ? "critical" : scheduleAssessable ? "default" : "warning"}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <details className="group mt-3 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none marker:hidden hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:text-slate-200">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-90">›</span>
            More metrics
          </span>
        </summary>
        <div className="grid border-t border-slate-200 sm:grid-cols-2 dark:border-slate-800">
          <SecondaryMetric
            label="Supplier Actual Bid Amount"
            value={coverage.withActualBidAmount === 0 ? "Unavailable" : formatDashboardCompactCurrency(kpis.actualBidAmount)}
            exactValue={coverage.withActualBidAmount === 0 ? undefined : formatDashboardCurrency(kpis.actualBidAmount)}
            detail={`${formatDashboardPercentage(abcCoverage)} bid-amount coverage`}
            icon={<CircleDollarSign className="size-4" />}
          />
          <SecondaryMetric
            label="At-risk assessment"
            value={atRiskValue}
            detail={atRiskDetail}
            tone={!scheduleAssessable || !majorityAssessed || kpis.atRiskProjects > 0 ? "warning" : "default"}
            icon={<Gauge className="size-4" />}
          />
        </div>
      </details>
    </section>
  );
}

function SecondaryMetric({
  label,
  value,
  exactValue,
  detail,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  exactValue?: string;
  detail: string;
  tone?: "default" | "warning";
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 p-4 first:border-b sm:first:border-r sm:first:border-b-0 dark:border-slate-800">
      <span aria-hidden="true" className={tone === "warning" ? "mt-0.5 text-amber-600" : "mt-0.5 text-slate-400"}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p title={exactValue} className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
          {exactValue ? <><span aria-hidden="true">{value}</span><span className="sr-only">Exact value: {exactValue}</span></> : value}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
