import { AlertTriangle, Banknote, CheckCircle2, CircleDollarSign, FolderKanban, Gauge } from "lucide-react";

import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { KpiCard } from "./kpi-card";

export function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDashboardPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatDashboardCount(value: number) {
  return value.toLocaleString("en-PH");
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
  return (
    <section aria-labelledby="executive-kpis-heading">
      <h2 id="executive-kpis-heading" className="sr-only">Executive portfolio indicators</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Projects monitored" value={formatDashboardCount(kpis.totalProjects)} definition="Count of projects in the signed-in user's authorized scope after dashboard filters." icon={<FolderKanban className="size-4" />} />
        <KpiCard label="Allocated budget" value={formatDashboardCurrency(kpis.allocatedBudget)} definition="Sum of non-null ABEMIS allocated amounts. This metric represents allocation only." detail={`${formatDashboardPercentage(budgetCoverage)} budget coverage`} icon={<Banknote className="size-4" />} />
        <KpiCard label="Approved Budget for Contract" value={formatDashboardCurrency(kpis.approvedBudgetForContract)} definition="Sum of Approved Budget for Contract (ABC). ABC is a procurement ceiling, not an awarded contract amount." icon={<CircleDollarSign className="size-4" />} />
        <KpiCard label="Completion rate" value={formatDashboardPercentage(kpis.completionRate)} definition="Canonically completed projects divided by all status-assessed projects in scope." icon={<CheckCircle2 className="size-4" />} />
        <KpiCard label="Delayed projects" value={formatDashboardCount(kpis.delayedProjects)} definition="Incomplete projects whose target completion date is before the dashboard as-of date." detail={`${formatDashboardPercentage(scheduleCoverage)} schedule coverage`} tone="critical" icon={<AlertTriangle className="size-4" />} />
        <KpiCard label="At-risk projects" value={formatDashboardCount(kpis.atRiskProjects)} definition="Active assessable projects meeting the transparent schedule-deficit or due-soon rule." tone="warning" icon={<Gauge className="size-4" />} />
      </div>
    </section>
  );
}
