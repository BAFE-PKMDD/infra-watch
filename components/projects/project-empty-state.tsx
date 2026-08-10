import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "@/i18n";

interface ProjectEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
}

export function ProjectEmptyState({ icon: Icon, title, description, actionLabel }: ProjectEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="p-6">
        <div className="text-center py-12">
          <Icon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-white">
            {t("projectDetail.common.noContent")}
          </h3>
          <p className="text-slate-600 mb-6 dark:text-slate-300">{description}</p>
          {actionLabel && (
            <button className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors">
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
