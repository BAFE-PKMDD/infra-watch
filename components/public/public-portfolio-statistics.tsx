import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";

export function PublicPortfolioStatistics({ result }: { result: InfraAnalyticsResult }) {
  if (result.status !== "ready" || !result.data) {
    return (
      <div className="rounded-xl border border-white/20 bg-slate-950/40 p-5 text-center text-sm font-semibold text-white backdrop-blur-md" role={result.status === "unavailable" ? "alert" : "status"}>
        {result.status === "empty"
          ? "No synchronized infrastructure statistics are available yet."
          : "Statistics temporarily unavailable. No estimated or reference figures are being shown."}
      </div>
    );
  }

  const { data } = result;
  const stats = [
    {
      label: "Approved budget",
      value: formatCurrencyCompact(data.summary.approvedBudget),
      description: `${formatNumber(data.summary.budgetCoverage.available)} of ${formatNumber(data.summary.budgetCoverage.total)} projects have approved-budget data`,
    },
    {
      label: "Projects monitored",
      value: formatNumber(data.totalTarget),
      description: data.scopeLabel,
    },
    {
      label: "Completed or turned over",
      value: `${data.summary.completedOrTurnedOver.percentage}%`,
      description: `${formatNumber(data.summary.completedOrTurnedOver.count)} of ${formatNumber(data.summary.completedOrTurnedOver.total)} projects`,
    },
    {
      label: "Projects mapped",
      value: formatNumber(data.summary.mappedProjects.count),
      description: `Only projects with valid source coordinates · ${formatNumber(data.summary.mappedProjects.total)} total`,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-h-32 rounded-xl border border-white/15 bg-white/[0.18] px-4 py-5 text-center shadow-xl backdrop-blur-md">
            <p className="text-2xl font-extrabold tabular-nums text-white drop-shadow-lg sm:text-xl md:text-2xl lg:text-3xl">{stat.value}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/95 md:text-sm">{stat.label}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/75">{stat.description}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] font-medium text-white/80">
        Source: {data.source.name} · Last successful sync: {data.source.lastSuccessfulSync}
      </p>
    </div>
  );
}
