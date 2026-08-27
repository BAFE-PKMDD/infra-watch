"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n";
import { 
  Target, 
  MapPin, 
  ClipboardList, 
  Wrench, 
  ThumbsUp, 
  Handshake, 
  ChevronRight,
  TrendingUp,
  BarChart4
} from "lucide-react";
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

type TooltipItem = {
  dataKey?: string | number;
  color?: string;
  name?: React.ReactNode;
  value?: React.ReactNode;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: React.ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-xl p-3.5 text-xs shadow-xl border border-slate-700 dark:border-slate-700/60 pointer-events-none">
      <p className="font-extrabold text-slate-200 border-b border-slate-800 dark:border-slate-700/80 pb-1.5 mb-2 text-[11px] uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item, index) => (
          <div key={`${String(item.dataKey)}-${index}`} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-mono font-extrabold text-white">{item.value}</span>
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

  if (!result.data) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <div role={result.status === "unavailable" ? "alert" : "status"} className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">Infrastructure Analytics</h1>
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

  const stageCards = [
    {
      key: "preImplementation",
      label: t("infraAnalytics.preImplementation"),
      value: `${data.stages.preImplementation.percentage}%`,
      count: data.stages.preImplementation.count,
      icon: <MapPin className="w-5 h-5 text-amber-500" />,
      accentClass: "bg-amber-500",
    },
    {
      key: "procurement",
      label: t("infraAnalytics.procurement"),
      value: `${data.stages.procurement.percentage}%`,
      count: data.stages.procurement.count,
      icon: <ClipboardList className="w-5 h-5 text-indigo-500" />,
      accentClass: "bg-indigo-500",
    },
    {
      key: "construction",
      label: t("infraAnalytics.construction"),
      value: `${data.stages.construction.percentage}%`,
      count: data.stages.construction.count,
      icon: <Wrench className="w-5 h-5 text-sky-500" />,
      accentClass: "bg-sky-500",
    },
    {
      key: "completed",
      label: t("infraAnalytics.completed"),
      value: `${data.stages.completed.percentage}%`,
      count: data.stages.completed.count,
      icon: <ThumbsUp className="w-5 h-5 text-emerald-500" />,
      accentClass: "bg-emerald-500",
    },
    {
      key: "turnedOver",
      label: t("infraAnalytics.turnedOver"),
      value: `${data.stages.turnedOver.percentage}%`,
      count: data.stages.turnedOver.count,
      icon: <Handshake className="w-5 h-5 text-orange-500" />,
      accentClass: "bg-orange-500",
    },
  ];


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-all duration-300">
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-500 to-amber-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Typographic Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200/80 dark:border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
                BAFE Monitoring System
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase leading-snug">
              {t("infraAnalytics.title")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              {t("infraAnalytics.asOf")} {data.asOfDate}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 px-3.5 shadow-sm hover:shadow transition-shadow">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {data.scopeLabel}
            </span>
          </div>
        </div>

        <aside aria-labelledby="statistics-method-title" className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 id="statistics-method-title" className="text-sm font-extrabold text-slate-950 dark:text-white">Source and calculation basis</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Source: {data.source.name}. Last successful sync: {data.source.lastSuccessfulSync}. Percentages divide each canonical lifecycle-stage count by {formatNumber(data.totalTarget)} synchronized public projects; FMR records are excluded because they belong to FMR Watch.
              </p>
            </div>
            <Link href="/projects" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">
              Inspect underlying projects
            </Link>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/50 dark:bg-slate-900"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Approved budget</dt><dd className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{formatCurrencyCompact(data.summary.approvedBudget)}</dd><p className="mt-1 text-[11px] text-slate-500">Sum of source allocated_amount values; {formatNumber(data.summary.budgetCoverage.available)} of {formatNumber(data.summary.budgetCoverage.total)} records available.</p></div>
            <div className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/50 dark:bg-slate-900"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Completed or turned over</dt><dd className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{data.summary.completedOrTurnedOver.percentage}%</dd><p className="mt-1 text-[11px] text-slate-500">{formatNumber(data.summary.completedOrTurnedOver.count)} canonical completed or turnover records.</p></div>
            <div className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/50 dark:bg-slate-900"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Coordinate-backed projects</dt><dd className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{formatNumber(data.summary.mappedProjects.count)}</dd><p className="mt-1 text-[11px] text-slate-500">Only valid source latitude/longitude pairs are counted; missing coordinates are not inferred.</p></div>
          </dl>
        </aside>

        {/* 6 KPI Status Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Target Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 dark:bg-white" />
            <div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {t("infraAnalytics.target")}
                </span>
                <Target className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {formatNumber(data.totalTarget)}
              </h3>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">
              <span>Portfolio total</span>
            </div>
          </motion.div>

          {/* 5 Implementation Percentage Cards */}
          {stageCards.map((card, idx) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (idx + 1) * 0.05 }}
              onClick={() => setActiveStageDetails(activeStageDetails === card.key ? null : card.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveStageDetails(activeStageDetails === card.key ? null : card.key);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={activeStageDetails === card.key}
              className={`relative border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer overflow-hidden bg-white dark:bg-slate-900 ${
                activeStageDetails === card.key ? "ring-2 ring-primary border-transparent" : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${card.accentClass}`} />
              <div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider truncate mr-1">
                    {card.label}
                  </span>
                  {card.icon}
                </div>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {card.value}
                </h3>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span className="group-hover:text-primary transition-colors">
                  {formatNumber(card.count)} {t("infraAnalytics.target").toLowerCase()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-slate-400 dark:text-slate-500" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info panel on active stages */}
        <AnimatePresence>
          {activeStageDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <div>
                  <span className="font-extrabold uppercase text-primary mr-2">
                    {t(`infraAnalytics.${activeStageDetails}`)} Detailed Breakdown:
                  </span>
                  <span>
                    Currently representing {data.stages[activeStageDetails as keyof typeof data.stages].count} out of {data.totalTarget} total AMEFIP projects monitorable in the system catalog.
                  </span>
                </div>
                <button 
                  className="text-[10px] font-extrabold text-primary border border-primary/20 hover:bg-primary/5 rounded px-2 py-1 cursor-pointer"
                  onClick={() => setActiveStageDetails(null)}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Charts Section: Layout Side-by-side or Stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Regional Target and Turned-over Projects (Takes 2 cols) */}
          <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <BarChart4 className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                    {t("infraAnalytics.charts.regionalTitle")}
                  </h2>
                </div>
              </div>

              {/* Graphic Chart Wrapper */}
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
                        tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }}
                      />
                      <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.05)" }} />
                      <ReLegend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, fontWeight: "bold", paddingBottom: 15, color: "#475569" }}
                      />
                      <Bar 
                        name={t("infraAnalytics.charts.targetLegend")} 
                        dataKey="target" 
                        fill="#3b82f6" 
                        radius={[3, 3, 0, 0]} 
                        maxBarSize={14}
                      />
                      <Bar 
                        name={t("infraAnalytics.charts.turnedOverLegend")} 
                        dataKey="turnedOver" 
                        fill="#f97316" 
                        radius={[3, 3, 0, 0]} 
                        maxBarSize={14}
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal mt-4">
              * Note: Operating Unit (RFOS) represents regional field offices responsible for validating local agricultural budgets.
            </p>
          </div>

          {/* Banner Program (Takes 1 col) */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <BarChart4 className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                    {t("infraAnalytics.charts.bannerTitle")}
                  </h2>
                </div>
              </div>

              {/* Graphic Chart Wrapper */}
              <div className="relative w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 760, height: 320 }}>
                    <ReBarChart
                      data={data.bannerStats}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-800/80" />
                      <XAxis 
                        type="number" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="program" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: "#475569", fontSize: 8, fontWeight: "bold" }}
                        width={90}
                        className="dark:fill-slate-300"
                      />
                      <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.05)" }} />
                      <ReLegend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, fontWeight: "bold", paddingBottom: 15, color: "#475569" }}
                      />
                      <Bar 
                        name={t("infraAnalytics.charts.targetLegend")} 
                        dataKey="target" 
                        fill="#ef4444" 
                        radius={[0, 3, 3, 0]} 
                        maxBarSize={10}
                      />
                      <Bar 
                        name={t("infraAnalytics.charts.turnedOverLegend")} 
                        dataKey="turnedOver" 
                        fill="#2563eb" 
                        radius={[0, 3, 3, 0]} 
                        maxBarSize={10}
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-normal mt-4">
              * Note: High Value Crops and Organic Agriculture are banner initiatives monitored under national targets.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
