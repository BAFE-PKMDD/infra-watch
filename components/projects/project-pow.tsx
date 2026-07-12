import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Calendar,
  PhilippinePeso,
  ExternalLink,
  TrendingUp,
  LineChart as ChartIcon,
  ChevronDown,
  ChevronUp,
  List
} from "lucide-react";
import { PowRelation } from "@/types/project.types";
import { useTranslation } from "@/i18n";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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

  const chartConfig = useMemo(() => ({
    target: {
      label: t("projectDetail.tabs.pow.targetProgress"),
      color: "#3b82f6",
    },
    actual: {
      label: t("projectDetail.tabs.pow.actualProgress"),
      color: "#10b981",
    },
  }), [t]);

  if (!powRelations || powRelations.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
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
      <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("projectDetail.sidebar.pow")} ({powRelations.length})
        </h2>
      </div>

      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <ChartIcon className="w-5 h-5 text-green-600 dark:text-green-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t("projectDetail.tabs.pow.sCurveTitle") || "Physical Progress (S-Curve)"}
          </h3>
        </div>

        {chartData.length > 0 ? (
          <div className="h-[300px] w-full mt-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: isMobile ? 9 : 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={isMobile ? "preserveStartEnd" : 0}
                    angle={isMobile ? -45 : -25}
                    textAnchor="end"
                    height={isMobile ? 65 : 50}
                    tickMargin={20}
                    tickFormatter={(value) => {
                      if (isMobile) {
                        return value.split(" ")[0];
                      }
                      return value;
                    }}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="target"
                    name={t("projectDetail.tabs.pow.targetProgress")}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTarget)"
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name={t("projectDetail.tabs.pow.actualProgress")}
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
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
          className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <List className="w-5 h-5 text-green-600 dark:text-green-500" />
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
                    // Calculate cumulative values for this specific entry relative to previous entries
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
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-green-600 dark:border-green-500 z-10" />

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-green-500/50 transition-all group shadow-none">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded shadow-none border border-slate-100 dark:border-slate-700">
                                <Calendar className="w-4 h-4 text-green-600 dark:text-green-500" />
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

                            {/* {pow.contract_cost && (
                              <div className="flex items-center gap-3 md:text-right">
                                <div className="hidden md:block">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {t("projectDetail.tabs.pow.cost")}
                                  </p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    ₱{parseFloat(pow.contract_cost).toLocaleString(language === "tl" ? "en-PH" : "en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </p>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 md:hidden">
                                  <PhilippinePeso className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="md:hidden">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {t("projectDetail.tabs.pow.cost")}
                                  </p>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    ₱{parseFloat(pow.contract_cost).toLocaleString(language === "tl" ? "en-PH" : "en-PH", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </p>
                                </div>
                              </div>
                            )} */}
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
                                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    {t("projectDetail.tabs.pow.actualProgress")}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-green-600 dark:text-green-400">
                                  {cumulativeActual.toFixed(2)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${cumulativeActual}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="bg-green-500 h-full rounded-full"
                                />
                              </div>
                            </div>

                            {pow.attachment_url && (
                              <div className="col-span-full">
                                <a
                                  href={pow.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
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
