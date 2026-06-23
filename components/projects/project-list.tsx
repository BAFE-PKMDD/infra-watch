import { Calendar, DollarSign, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ProjectDisplayItem } from "@/types";

interface ProjectListProps {
  projects: ProjectDisplayItem[];
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-800">
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          className="p-6 hover:bg-emerald-50/30 transition-colors"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 * index, ease: "easeOut" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 mb-1 dark:text-white">{project.name}</h3>
              <p className="text-xs text-slate-500 font-mono dark:text-slate-400">{project.code}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Location</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{project.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Budget</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(project.budget)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Start Date</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{project.startDate}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </Card>
  );
}
