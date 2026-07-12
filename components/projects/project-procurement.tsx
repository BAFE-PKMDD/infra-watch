import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ListChecks,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  List,
  Milestone
} from "lucide-react";
import { ProcurementRelation } from "@/types/project.types";
import { useTranslation } from "@/i18n";

interface ProjectProcurementProps {
  procurementRelations: ProcurementRelation[];
  isActive?: boolean;
}

export function ProjectProcurement({ procurementRelations, isActive }: ProjectProcurementProps) {
  const { t, language } = useTranslation();
  const [isListExpanded, setIsListExpanded] = useState(false);

  // Sort relations by actual date from lowest to highest
  const sortedMilestones = useMemo(() => {
    if (!procurementRelations || procurementRelations.length === 0) return [];
    return [...procurementRelations].sort((a, b) => {
      const timeA = a.actual_date ? new Date(a.actual_date).getTime() : (a.target_date ? new Date(a.target_date).getTime() : Infinity);
      const timeB = b.actual_date ? new Date(b.actual_date).getTime() : (b.target_date ? new Date(b.target_date).getTime() : Infinity);
      return timeA - timeB;
    });
  }, [procurementRelations]);

  if (!procurementRelations || procurementRelations.length === 0) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
        initial={{ opacity: 0, y: 12 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-lg font-semibold">{t("projectDetail.sidebar.procurement")}</h2>
        </div>
        <div className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <ListChecks className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("projectDetail.tabs.procurement.empty")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("projectDetail.tabs.procurement.emptyDesc")}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("projectDetail.sidebar.procurement")} ({procurementRelations.length})
        </h2>
      </div>

      <div className="p-3 md:p-6">
        <motion.div
          className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 md:ml-6 space-y-4 pt-2 pb-2"
          variants={containerVariants}
          initial="hidden"
          animate={isActive ? "visible" : "hidden"}
        >
          {sortedMilestones.map((milestone: ProcurementRelation, index: number) => (
            <motion.div
              key={milestone.id || index}
              className="relative pl-5 md:pl-8"
              variants={itemVariants}
            >
              {/* Timeline Dot */}
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-green-600 dark:border-green-500 z-10" />

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-3 md:p-4 hover:border-green-500/50 transition-all group shadow-none">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded shadow-none border border-slate-100 dark:border-slate-700 shrink-0">
                      <Milestone className="w-4 h-4 text-green-600 dark:text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">
                        {t("projectDetail.tabs.procurement.milestone") || "Milestone"}
                      </p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight break-words">
                        {milestone.milestone || t("projectDetail.tabs.procurement.item").replace("{index}", String(index + 1))}
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {milestone.target_date && (
                      <div className="flex flex-col min-w-fit">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {t("projectDetail.tabs.procurement.targetDate")}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-blue-800/50 w-fit">
                          {new Date(milestone.target_date).toLocaleDateString(language === 'tl' ? "en-PH" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                    {milestone.actual_date && (
                      <div className="flex flex-col min-w-fit">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Calendar className="w-3 h-3 text-green-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {t("projectDetail.tabs.procurement.actualDate")}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-100 dark:border-green-800/50 w-fit">
                          {new Date(milestone.actual_date).toLocaleDateString(language === 'tl' ? "en-PH" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {milestone.factors_affecting_progress && (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          {t("projectDetail.tabs.procurement.factors")}
                        </span>
                      </div>
                      <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {milestone.factors_affecting_progress}
                      </p>
                    </div>
                  )}

                  {milestone.measures_undertaken && (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ListChecks className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          {t("projectDetail.tabs.procurement.measures")}
                        </span>
                      </div>
                      <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {milestone.measures_undertaken}
                      </p>
                    </div>
                  )}

                  {milestone.remarks && (
                    <div className="col-span-full bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        {t("projectDetail.tabs.procurement.remarks")}
                      </p>
                      <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {milestone.remarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
