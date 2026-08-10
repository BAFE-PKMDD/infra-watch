import { FileText, Image as ImageIcon, MessageSquare, Video, Package, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "@/i18n";

import type { ProjectTabKey } from "@/types";

interface ProjectSidebarProps {
  activeTab: ProjectTabKey;
  onTabChange: (tab: ProjectTabKey) => void;
  tabCounts?: Partial<Record<ProjectTabKey, number>>;
}

export function ProjectSidebar({ activeTab, onTabChange, tabCounts = {} }: ProjectSidebarProps) {
  const { t } = useTranslation();

  const tabs: { key: ProjectTabKey; label: string; icon: LucideIcon }[] = [
    { key: "overview", label: t("projectDetail.sidebar.details"), icon: FileText },
    { key: "articles", label: t("projectDetail.sidebar.articles"), icon: FileText },
    { key: "photos", label: t("projectDetail.sidebar.photos"), icon: ImageIcon },
    { key: "videos", label: t("projectDetail.sidebar.videos"), icon: Video },
    // { key: "documents", label: t("projectDetail.sidebar.documents"), icon: FileText },
    { key: "pow", label: t("projectDetail.sidebar.pow"), icon: Package },
    { key: "procurement", label: t("projectDetail.sidebar.procurement"), icon: ListChecks },
    { key: "feedback", label: t("projectDetail.sidebar.feedback"), icon: MessageSquare },
  ];

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden sticky top-24 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <nav className="flex flex-col">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key];

          return (
            <motion.button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-l-4 ${isActive
                ? "bg-green-50 text-green-600 border-green-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "text-slate-700 hover:bg-slate-50 border-transparent dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              type="button"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.04 * index, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                {tab.label}
              </div>
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
}
