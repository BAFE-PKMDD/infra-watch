import { Calendar } from "lucide-react";
import { motion } from "motion/react";

import type { ProjectUpdate } from "@/types";

interface ProjectUpdatesProps {
  updates: ProjectUpdate[];
}

export function ProjectUpdates({ updates }: ProjectUpdatesProps) {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
        <h2 className="text-lg font-semibold">Project Updates</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {updates.map((update, index) => (
            <motion.div
              key={index}
              className="border-l-4 border-green-500 pl-4 py-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.04 * index, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-300">{update.date}</p>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1 dark:text-white">{update.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{update.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
