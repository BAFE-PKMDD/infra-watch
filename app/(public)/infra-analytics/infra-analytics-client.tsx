"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslation } from "@/i18n";
import { BarChart4 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend as ReLegend
} from "recharts";
import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";
import Link from "next/link";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type TooltipItem = {
  dataKey?: string | number;
  color?: string;
  name?: React.ReactNode;
  value?: React.ReactNode;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: React.ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg p-3.5 text-xs shadow-lg border border-slate-700 dark:border-slate-700/60 pointer-events-none">
      <p className="font-bold text-slate-200 border-b border-slate-800 dark:border-slate-700/80 pb-1.5 mb-2 text-xs">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={`${String(item.dataKey)}-${index}`} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-mono font-bold text-white tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClientProps {
  initialResult: InfraAnalyticsResult;
}

export function InfraAnalyticsClient({ initialResult }: ClientProps) {
  const { t } = useTranslation();
  const [result] = useState<InfraAnalyticsResult>(initialResult);
  const [activeStageDetails, setActiveStageDetails] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  if (!result.data) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <div role={result.status === "unavailable" ? "alert" : "status"} className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Infrastructure Analytics</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {result.status === "empty"
              ? "No infrastructure project data is currently available. Statistics will appear after a successful synchronization."
              : "Infrastructure analytics are temporarily unavailable. No reference or estimated figures are being shown."}
          </p>
        </div>
      </div>
    );
  }

  const data = result.data;
  const { schedulePerformance } = data;

  const stageRows = [
    { key: "preImplementation", label: t("infraAnalytics.preImplementation"), barClass: "bg-slate-300 dark:bg-slate-700" },
    { key: "procurement", label: t("infraAnalytics.procurement"), barClass: "bg-primary/45" },
    { key: "construction", label: t("infraAnalytics.construction"), barClass: "bg-primary" },
    { key: "completed", label: t("infraAnalytics.completed"), barClass: "bg-emerald-500" },
    { key: "turnedOver", label: t("infraAnalytics.turnedOver"), barClass: "bg-emerald-600" },
  ] as const;

  const overdueRate = schedulePerformance.total > 0
    ? Number(((schedulePerformance.overdueCount / schedulePerformance.total) * 100).toFixed(1))
    : 0;

  const rowMotionProps = (delay = 0) => (
    prefersReducedMotion
      ? {}
      : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay } }
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              BAFE monitoring &middot; {data.scopeLabel}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {t("infraAnalytics.title")}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("infraAnalytics.asOf")} {data.asOfDate}
          </p>
        </header>

        {/* Portfolio total and lifecycle-stage breakdown */}
        <section>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatNumber(data.totalTarget)}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              projects &middot; {formatCurrencyCompact(data.summary.approvedBudget)} approved budget
            </span>
          </div>

          <div className="mt-6 space-y-1">
            {stageRows.map((stage, idx) => {
              const stat = data.stages[stage.key];
              const isActive = activeStageDetails === stage.key;
              return (
                <motion.button
                  key={stage.key}
                  type="button"
                  {...rowMotionProps(idx * 0.04)}
                  onClick={() => setActiveStageDetails(isActive ? null : stage.key)}
                  aria-expanded={isActive}
                  className={cn(
                    "group w-full text-left rounded-md px-3 py-2.5 transition-colors",
                    isActive ? "bg-primary/5" : "hover:bg-slate-100 dark:hover:bg-slate-900",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={cn("font-medium", isActive ? "text-primary" : "text-slate-800 dark:text-slate-200")}>
                      {stage.label}
                    </span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-400">
                      {formatNumber(stat.count)} &middot; {stat.percentage}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={cn("h-full rounded-full", stage.barClass)} style={{ width: `${stat.percentage}%` }} />
                  </div>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {activeStageDetails && (
              <motion.div
                initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-primary/5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    {formatNumber(data.stages[activeStageDetails as keyof typeof data.stages].count)} of {formatNumber(data.totalTarget)} total projects are {t(`infraAnalytics.${activeStageDetails}`).toLowerCase()}.
                  </p>
                  <button
                    className="shrink-0 min-h-11 min-w-11 text-xs font-semibold text-primary hover:underline"
                    onClick={() => setActiveStageDetails(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Schedule and data notes, stated plainly rather than boxed */}
        <section className="border-t border-slate-200 dark:border-slate-800 pt-6 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{t("infraAnalytics.performancePanel.title")}</p>
            {schedulePerformance.total === 0 ? (
              <p className="mt-1.5 text-slate-500 dark:text-slate-400 leading-relaxed">
                {t("infraAnalytics.schedulePerformance.unavailable")} &mdash; {t("infraAnalytics.schedulePerformance.unavailableDetail")}
              </p>
            ) : (
              <p className="mt-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                {overdueRate}% {t("infraAnalytics.schedulePerformance.overdueLabel")} &mdash; {t("infraAnalytics.schedulePerformance.detail", {
                  overdueCount: formatNumber(schedulePerformance.overdueCount),
                  total: formatNumber(schedulePerformance.total),
                })}{" "}
                {schedulePerformance.medianDaysOverdue !== null
                  ? t("infraAnalytics.schedulePerformance.median", { days: formatNumber(schedulePerformance.medianDaysOverdue) })
                  : t("infraAnalytics.schedulePerformance.medianUnavailable")}{" "}
                {t("infraAnalytics.schedulePerformance.unknown", { count: formatNumber(schedulePerformance.unknownScheduleCount) })}
              </p>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">About this data</p>
            <p className="mt-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
              From the {data.source.name}, last synced {data.source.lastSuccessfulSync}. {formatNumber(data.summary.budgetCoverage.available)} of {formatNumber(data.summary.budgetCoverage.total)} projects have a recorded budget, and {formatNumber(data.summary.mappedProjects.count)} of {formatNumber(data.summary.mappedProjects.total)} have map coordinates. Farm-to-market road projects are tracked separately in FMR Watch.
            </p>
            <Link href="/projects" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
              Browse all projects &rarr;
            </Link>
          </div>
        </section>

        {/* Charts: at most two primary analytical views */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <BarChart4 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("infraAnalytics.charts.regionalTitle")}
                </h2>
              </div>

              <div className="relative w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 760, height: 320 }}>
                    <ReBarChart
                      data={data.regionalStats}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/80" />
                      <XAxis
                        dataKey="region"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: "bold" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: "bold" }}
                      />
                      <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
                      <ReLegend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, fontWeight: "bold", paddingBottom: 15, color: "#475569" }}
                      />
                      <Bar
                        name={t("infraAnalytics.charts.targetLegend")}
                        dataKey="target"
                        fill="var(--chart-1)"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={14}
                      />
                      <Bar
                        name={t("infraAnalytics.charts.turnedOverLegend")}
                        dataKey="turnedOver"
                        fill="var(--chart-2)"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={14}
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mt-4">
              Operating Unit (RFOS) represents regional field offices responsible for validating local agricultural budgets.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <BarChart4 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("infraAnalytics.charts.bannerTitle")}
                </h2>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {data.bannerStats.map((item) => {
                  const turnedOverShare = item.target > 0 ? (item.turnedOver / item.target) * 100 : 0;
                  return (
                    <div key={item.program}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.program}</span>
                        <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          {formatNumber(item.turnedOver)} of {formatNumber(item.target)} turned over
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${turnedOverShare}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal mt-4">
              High Value Crops and Organic Agriculture are banner initiatives monitored under national targets.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
