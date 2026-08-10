"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import type { ManagerialDashboardData, ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";

export function applyInsightFilter(callback: (filter: Partial<ManagerialDashboardFilters>) => void, filter: Partial<ManagerialDashboardFilters>) {
  callback(filter);
}

export function ExecutiveInsights({ insights, onApplyFilter }: { insights: ManagerialDashboardData["insights"]; onApplyFilter: (filter: Partial<ManagerialDashboardFilters>) => void }) {
  const visibleInsights = insights.slice(0, 3);
  return (
    <section aria-labelledby="executive-insights-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="executive-insights-heading" className="text-base font-extrabold text-slate-950 dark:text-white">Executive attention</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Deterministic insights from approved metrics</p>
      </div>
      {visibleInsights.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200">
          <CheckCircle2 className="size-4" /> No material portfolio exception is identified for the current filters.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {visibleInsights.map((insight, index) => {
            const Icon = insight.severity === "critical" || insight.severity === "warning" ? AlertTriangle : Info;
            return (
              <article key={`${insight.title}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-2">
                  <Icon className={insight.severity === "critical" ? "mt-0.5 size-4 text-red-600" : insight.severity === "warning" ? "mt-0.5 size-4 text-amber-600" : "mt-0.5 size-4 text-primary"} aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{insight.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{insight.detail}</p>
                  </div>
                </div>
                {insight.filter && (
                  <button type="button" onClick={() => applyInsightFilter(onApplyFilter, insight.filter!)} className="mt-3 text-xs font-extrabold text-primary hover:underline">
                    Show affected projects
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
