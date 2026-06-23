import Link from "next/link";
import { Calendar, PhilippinePeso, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { ProjectDisplayItem } from "@/types";

interface ProjectGridProps {
  projects: ProjectDisplayItem[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          className="content-visibility-auto"
          variants={index < 12 ? cardVariants : undefined}
          initial={index >= 12 ? { opacity: 1 } : undefined}
        >
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full bg-slate-50/50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <StatusBadge status={project.stage || "Not yet started"} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2 line-clamp-2 dark:text-white">{project.name}</h3>
                <p className="text-xs text-slate-500 font-mono mb-4 dark:text-slate-400">{project.code}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-200">{project.location}</p>
                </div>
                <div className="flex items-start gap-2">
                  <PhilippinePeso className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(project.budget)}</p>
                </div>
              </div>
              <Link
                href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`}
                className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full text-center")}
              >
                View Details
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
