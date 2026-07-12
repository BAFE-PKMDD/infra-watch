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
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full bg-[#121927] border-slate-800">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <StatusBadge status={project.stage || "Not yet started"} />
              </div>
              <div>
                <h3 className="text-[15px] leading-snug font-bold text-white mb-2 line-clamp-2">{project.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono mb-4 tracking-wide uppercase">{project.code}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" />
                  <p className="text-sm text-slate-300">{project.location}</p>
                </div>
                <div className="flex items-start gap-2">
                  <PhilippinePeso className="w-[18px] h-[18px] text-slate-400 flex-shrink-0" />
                  <p className="text-[15px] font-bold text-white">{formatCurrency(project.budget)}</p>
                </div>
              </div>
              <Link
                href={`/projects/${project.id}${queryString ? `?${queryString}` : ""}`}
                className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full text-center bg-[#4caf50] hover:bg-[#43a047] text-[#111827] font-semibold tracking-wide border-0 transition-colors")}
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
