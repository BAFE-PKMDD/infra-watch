"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Calendar,
  TrendingUp,
  LineChart as ChartIcon,
  ChevronDown,
  ChevronUp,
  List,
  ExternalLink
} from "lucide-react";
import { PowRelation } from "@/types/project.types";
import { useTranslation } from "@/i18n";

interface ProjectPowProps {
  powRelations: PowRelation[];
}

export function ProjectPow({ powRelations }: ProjectPowProps) {
  const { t, language } = useTranslation();
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Calculate S-Curve Data
  const chartData = useMemo(() => {
    if (!powRelations || powRelations.length === 0) return [];

    const sortedPows = [...powRelations]
      .filter((p) => p.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    if (sortedPows.length === 0) return [];

    const data: { name: string; target: number; actual: number }[] = [];
    const startDate = new Date(sortedPows[0].date!);
    const endDate = new Date(sortedPows[sortedPows.length - 1].date!);

    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    let lastTarget = 0;
    let lastActual = 0;

    while (current <= last) {
      const monthLabel = current.toLocaleDateString(language === "tl" ? "en-PH" : "en-US", {
        month: "short",
        year: "numeric",
      });

      const monthEntries = sortedPows.filter((p) => {
        const d = new Date(p.date!);
        return d.getMonth() === current.getMonth() && d.getFullYear() === current.getFullYear();
      });

      if (monthEntries.length > 0) {
        const monthTarget = monthEntries.reduce((sum, p) => sum + parseFloat(p.target || "0"), 0);
        const monthActual = monthEntries.reduce((sum, p) => sum + parseFloat(p.actual || "0"), 0);

        lastTarget += monthTarget;
        lastActual += monthActual;
      }

      data.push({
        name: monthLabel,
        target: Math.min(lastTarget, 100),
        actual: Math.min(lastActual, 100),
      });

      current.setMonth(current.getMonth() + 1);
    }

    return data;
  }, [powRelations, language]);

  // SVG Chart Dimensions
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const svgChart = useMemo(() => {
    if (chartData.length < 2) return null;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
      const targetY = padding.top + chartHeight - (d.target / 100) * chartHeight;
      const actualY = padding.top + chartHeight - (d.actual / 100) * chartHeight;
      return { x, targetY, actualY, label: d.name, targetVal: d.target, actualVal: d.actual };
    });

    // Create SVG paths
    const targetLinePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.targetY}`).join(" ");
    const actualLinePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.actualY}`).join(" ");

    const targetAreaPath = `${targetLinePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
    const actualAreaPath = `${actualLinePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    return {
      points,
      targetLinePath,
      actualLinePath,
      targetAreaPath,
      actualAreaPath,
      chartWidth,
      chartHeight
    };
  }, [chartData]);

  if (!powRelations || powRelations.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold">{t("projectDetail.sidebar.pow")}</h2>
        </div>
        <div className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("projectDetail.tabs.pow.empty")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("projectDetail.tabs.pow.emptyDesc")}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="bg-emerald-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("projectDetail.sidebar.pow")} ({powRelations.length})
        </h2>
      </div>

      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t("projectDetail.tabs.pow.sCurveTitle") || "Physical Progress (S-Curve)"}
          </h3>
        </div>

        {svgChart ? (
          <div className="w-full mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mb-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-blue-500 rounded" />
                <span className="text-slate-600 dark:text-slate-300">{t("projectDetail.tabs.pow.targetProgress")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-emerald-500 rounded" />
                <span className="text-slate-600 dark:text-slate-300">{t("projectDetail.tabs.pow.actualProgress")}</span>
              </div>
            </div>

            <div className="relative w-full overflow-x-auto">
              <svg 
                viewBox={`0 0 ${width} ${height}`} 
                className="w-full h-auto min-w-[500px]"
              >
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = padding.top + svgChart.chartHeight - (tick / 100) * svgChart.chartHeight;
                  return (
                    <g key={tick} className="opacity-40">
                      <line 
                        x1={padding.left} 
                        y1={y} 
                        x2={width - padding.right} 
                        y2={y} 
                        stroke="#cbd5e1" 
                        strokeDasharray="4 4"
                      />
                      <text 
                        x={padding.left - 10} 
                        y={y + 4} 
                        textAnchor="end" 
                        className="text-[10px] fill-slate-400 font-bold"
                      >
                        {tick}%
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {svgChart.points.map((p, i) => (
                  <text
                    key={i}
                    x={p.x}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-400 font-bold"
                  >
                    {isMobile && p.label.includes(",") ? p.label.split(",")[0] : p.label}
                  </text>
                ))}

                {/* Areas */}
                <path 
                  d={svgChart.targetAreaPath} 
                  fill="url(#targetGrad)" 
                  className="opacity-40"
                />
                <path 
                  d={svgChart.actualAreaPath} 
                  fill="url(#actualGrad)" 
                  className="opacity-40"
                />

                {/* Lines */}
                <path 
                  d={svgChart.targetLinePath} 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />
                <path 
                  d={svgChart.actualLinePath} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {svgChart.points.map((p, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle 
                      cx={p.x} 
                      cy={p.targetY} 
                      r="4" 
                      fill="#3b82f6" 
                      stroke="#fff" 
                      strokeWidth="1.5"
                    />
                    <circle 
                      cx={p.x} 
                      cy={p.actualY} 
                      r="4" 
                      fill="#10b981" 
                      stroke="#fff" 
                      strokeWidth="1.5"
                    />
                  </g>
                ))}

                {/* Gradients */}
                <defs>
                  <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                  </linearGradient>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm italic">
            {t("projectDetail.tabs.pow.insufficientData") || "Insufficient data for S-curve visualization"}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6">
        <button
          onClick={() => setIsListExpanded(!isListExpanded)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group shadow-none border-0"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <List className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {isListExpanded ? "Hide Details" : "Show Details"}
              </h4>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                View all {powRelations.length} progress reports
              </p>
            </div>
          </div>
          {isListExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </button>

        <AnimatePresence>
          {isListExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 space-y-4 pt-4">
                {[...powRelations]
                  .filter((p) => p.date)
                  .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
                  .map((pow, index, sortedArray) => {
                    const entriesUpToNow = sortedArray.slice(0, index + 1);
                    const cumulativeTarget = Math.min(
                      entriesUpToNow.reduce((sum, curr) => sum + parseFloat(curr.target || "0"), 0),
                      100
                    );
                    const cumulativeActual = Math.min(
                      entriesUpToNow.reduce((sum, curr) => sum + parseFloat(curr.actual || "0"), 0),
                      100
                    );

                    return (
                      <div key={pow.id || index} className="relative pl-6 md:pl-8">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-600 dark:border-emerald-500 z-10" />

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-emerald-500/50 transition-all group shadow-none">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded shadow-none border border-slate-100 dark:border-slate-700">
                                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {t("projectDetail.tabs.pow.date")}
                                </p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {new Date(pow.date!).toLocaleDateString(language === "tl" ? "en-PH" : "en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Target Progress Card */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    {t("projectDetail.tabs.pow.targetProgress")}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                  {cumulativeTarget.toFixed(2)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cumulativeTarget}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="bg-blue-500 h-full rounded-full"
                                />
                              </div>
                            </div>

                            {/* Actual Progress Card */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    {t("projectDetail.tabs.pow.actualProgress")}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                  {cumulativeActual.toFixed(2)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cumulativeActual}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="bg-emerald-500 h-full rounded-full"
                                />
                              </div>
                            </div>

                            {pow.attachment_url && (
                              <div className="col-span-full">
                                <a
                                  href={pow.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  {t("projectDetail.tabs.pow.viewAttachment")}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
