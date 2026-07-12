"use client";

import React, { useState, useEffect } from "react";
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
import type { InfraAnalyticsData } from "@/actions/query/analytics.query";

interface ClientProps {
  initialData: InfraAnalyticsData;
}

export function InfraAnalyticsClient({ initialData }: ClientProps) {
  const { t } = useTranslation();
  const [data] = useState<InfraAnalyticsData>(initialData);
  const [mounted, setMounted] = useState(false);
  const [activeStageDetails, setActiveStageDetails] = useState<string | null>(null);

  // Avoid hydration mismatch by waiting for client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Custom Styled Tooltip Component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-xl p-3.5 text-xs shadow-xl border border-slate-850 dark:border-slate-700/60 pointer-events-none">
          <p className="font-extrabold text-slate-200 border-b border-slate-800 dark:border-slate-700/80 pb-1.5 mb-2 text-[11px] uppercase tracking-wider">
            {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((item: any) => (
              <div key={item.dataKey} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}:
                </span>
                <span className="font-mono font-extrabold text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-all duration-300">
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-500 to-amber-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Typographic Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200/80 dark:border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-450 dark:text-slate-500">
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
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
              AMEFIP FY 2026
            </span>
          </div>
        </div>

        {/* 6 KPI Status Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Target Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative border border-slate-250 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 dark:bg-white" />
            <div>
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {t("infraAnalytics.target")}
                </span>
                <Target className="w-5 h-5 text-slate-700 dark:text-slate-350" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {data.totalTarget}
              </h3>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">
              <span>{t("infraAnalytics.viewBreakdown")}</span>
              <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
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
              className={`relative border rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer overflow-hidden bg-white dark:bg-slate-900 ${
                activeStageDetails === card.key ? "ring-2 ring-primary border-transparent" : "border-slate-250 dark:border-slate-850"
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${card.accentClass}`} />
              <div>
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider truncate mr-1">
                    {card.label}
                  </span>
                  {card.icon}
                </div>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {card.value}
                </h3>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                <span className="group-hover:text-primary transition-colors">
                  {card.count} {t("infraAnalytics.target").toLowerCase()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-slate-300 dark:text-slate-650" />
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
              <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10 text-xs text-slate-650 dark:text-slate-350 flex items-center justify-between">
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
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-850 dark:text-white">
                    {t("infraAnalytics.charts.regionalTitle")}
                  </h2>
                </div>
              </div>

              {/* Graphic Chart Wrapper */}
              <div className="relative w-full h-[320px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
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
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl animate-pulse">
                    <span className="text-xs text-slate-400">Loading Regional Chart...</span>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal mt-4">
              * Note: Operating Unit (RFOS) represents regional field offices responsible for validating local agricultural budgets.
            </p>
          </div>

          {/* Banner Program (Takes 1 col) */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <BarChart4 className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-850 dark:text-white">
                    {t("infraAnalytics.charts.bannerTitle")}
                  </h2>
                </div>
              </div>

              {/* Graphic Chart Wrapper */}
              <div className="relative w-full h-[320px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
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
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl animate-pulse">
                    <span className="text-xs text-slate-400">Loading Banner Program Chart...</span>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal mt-4">
              * Note: High Value Crops and Organic Agriculture are banner initiatives monitored under national targets.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
