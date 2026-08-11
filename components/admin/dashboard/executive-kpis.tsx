import { AlertTriangle, Banknote, CheckCircle2, CircleDollarSign, FolderKanban, Gauge } from "lucide-react";

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
}: {
  kpis: ManagerialDashboardData["kpis"];
  coverage: ManagerialDashboardData["coverage"];
}) {
  const budgetCoverage = coverage.total > 0 ? (coverage.withBudget / coverage.total) * 100 : 0;
  const scheduleCoverage = coverage.total > 0 ? (coverage.withSchedule / coverage.total) * 100 : 0;
  const abcCoverage = coverage.total > 0 ? (coverage.withActualBidAmount / coverage.total) * 100 : 0;
  const scheduleAssessable = coverage.withSchedule > 0;
  const scheduleDetail = `${formatDashboardCount(coverage.withSchedule)} of ${formatDashboardCount(coverage.total)} projects have schedule dates`;
  return (
    <section aria-labelledby="executive-kpis-heading">
      <h2 id="executive-kpis-heading" className="sr-only">Executive portfolio indicators</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Projects monitored" value={formatDashboardCount(kpis.totalProjects)} definition="Count of projects in the signed-in user's authorized scope after dashboard filters." icon={<FolderKanban className="size-4" />} />
        <KpiCard label="Allocated budget" value={formatDashboardCompactCurrency(kpis.allocatedBudget)} valueTitle={formatDashboardCurrency(kpis.allocatedBudget)} definition="Sum of non-null ABEMIS allocated amounts. Allocated amount is the approved project budget." detail={`${formatDashboardPercentage(budgetCoverage)} approved-budget coverage`} icon={<Banknote className="size-4" />} />
        <KpiCard label="Supplier actual bid amount" value={coverage.withActualBidAmount === 0 ? "Unavailable" : formatDashboardCompactCurrency(kpis.actualBidAmount)} valueTitle={coverage.withActualBidAmount === 0 ? undefined : formatDashboardCurrency(kpis.actualBidAmount)} definition="Sum of non-null ABEMIS ABC values. In this source, ABC stores the supplier's actual bid amount." detail={`${formatDashboardPercentage(abcCoverage)} bid-amount coverage`} icon={<CircleDollarSign className="size-4" />} />
        <KpiCard label="Completion rate" value={formatDashboardPercentage(kpis.completionRate)} definition="Canonically completed projects divided by all status-assessed projects in scope." icon={<CheckCircle2 className="size-4" />} />
        <KpiCard label="Delayed projects" value={scheduleAssessable ? formatDashboardCount(kpis.delayedProjects) : "Not assessable"} definition="Incomplete projects whose target completion date is before the dashboard as-of date." detail={scheduleAssessable ? `${formatDashboardPercentage(scheduleCoverage)} schedule coverage` : scheduleDetail} tone={scheduleAssessable && kpis.delayedProjects > 0 ? "critical" : scheduleAssessable ? "default" : "warning"} icon={<AlertTriangle className="size-4" />} />
        <KpiCard label="At-risk projects" value={scheduleAssessable ? formatDashboardCount(kpis.atRiskProjects) : "Not assessable"} definition="Active assessable projects meeting the transparent schedule-deficit or due-soon rule." detail={scheduleAssessable ? `${formatDashboardCount(coverage.withSchedule)} of ${formatDashboardCount(coverage.total)} projects assessed` : scheduleDetail} tone={kpis.atRiskProjects > 0 || !scheduleAssessable ? "warning" : "default"} icon={<Gauge className="size-4" />} />
      </div>
    </section>
  );
}
