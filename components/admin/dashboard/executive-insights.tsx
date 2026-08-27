"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";

import type {
  ManagerialDashboardData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export function applyInsightFilter(
  callback: (filter: Partial<ManagerialDashboardFilters>) => void,
  filter: Partial<ManagerialDashboardFilters>,
) {
  callback(filter);
}

export function formatAttentionStatement(insight: ManagerialDashboardData["insights"][number]) {
  if (insight.title === "Schedule-data coverage is limited") {
    const percentage = insight.detail.match(/([\d.]+)%/)?.[1];
    return percentage ? `Only ${Math.round(Number(percentage))}% of projects have schedule data.` : insight.detail;
  }
  if (insight.title === "Budget exposure needs attention") {
    const amount = Number(insight.detail.match(/₱([\d,]+)/)?.[1]?.replaceAll(",", ""));
    if (Number.isFinite(amount) && amount > 0) {
      const compact = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 2 }).format(amount);
      return `${compact} is tied to delayed or at-risk projects.`;
    }
  }
  const regionalMatch = insight.title.match(/^(.+) has the highest delayed-project rate$/);
  const delayedCount = insight.detail.match(/^(\d+) of/);
  if (regionalMatch && delayedCount) {
    return `${Number(delayedCount[1]).toLocaleString("en-PH")} projects are delayed in ${regionalMatch[1]}.`;
  }
  return insight.detail;
}

export function ExecutiveInsights({
  insights,
  onApplyFilter,
  interactive = true,
}: {
  insights: ManagerialDashboardData["insights"];
  onApplyFilter: (filter: Partial<ManagerialDashboardFilters>) => void;
  interactive?: boolean;
}) {
  const visibleInsights = insights.slice(0, 3);
  return (
    <section aria-labelledby="executive-insights-heading">
      <h2 id="executive-insights-heading" className="mb-3 text-base font-semibold text-slate-950 dark:text-white">
        Needs Attention
      </h2>
      {visibleInsights.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200">
          <CheckCircle2 className="size-4" /> No significant project issues identified for the current filters.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {visibleInsights.map((insight) => {
            const Icon = insight.severity === "critical" || insight.severity === "warning" ? AlertTriangle : Info;
            return (
              <article
                data-attention-item={insight.severity}
                key={`${insight.severity}-${insight.title}-${insight.detail}`}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Icon
                    className={insight.severity === "critical" ? "mt-0.5 size-4 shrink-0 text-red-600" : insight.severity === "warning" ? "mt-0.5 size-4 shrink-0 text-amber-600" : "mt-0.5 size-4 shrink-0 text-primary"}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-slate-950 dark:text-white">{formatAttentionStatement(insight)}</p>
                  </div>
                </div>
                {interactive && (
                  insight.filter ? (
                    <button
                      type="button"
                      onClick={() => applyInsightFilter(onApplyFilter, insight.filter!)}
                      className="shrink-0 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:self-center"
                    >
                      View affected projects
                    </button>
                  ) : (
                    <Link
                      href="/admin-projects"
                      className="shrink-0 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:self-center"
                    >
                      View all projects
                    </Link>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
