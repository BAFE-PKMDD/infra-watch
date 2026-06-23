"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import type { ProjectDetail } from "@/types";

interface ProjectHeroProps {
  project: ProjectDetail;
}

export function ProjectHero({ project }: ProjectHeroProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const handleShare = async () => {
    const projectUrl = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: project.name,
          text: `Check out this project details: ${project.name}`,
          url: projectUrl,
        });
      } else {
        await navigator.clipboard.writeText(projectUrl);
        toast.success("Project details link copied to clipboard!");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Failed to share link");
    }
  };

  return (
    <div className="relative h-[340px] md:h-[280px] overflow-hidden bg-slate-950 border-b border-slate-800">
      {/* Background Grid & Gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-slate-900/80 to-slate-950" />
      </div>

      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between py-6 pb-20 md:py-6 md:pb-22">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex items-center justify-between"
        >
          <Link 
            href={`/projects${queryString ? `?${queryString}` : ""}`} 
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group font-semibold text-xs"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>{t("projectDetail.backToProjects") || "Back to Catalog"}</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-colors border border-white/5"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        >
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-flex px-2.5 py-0.5 bg-accent text-white text-[9px] font-extrabold uppercase tracking-wider rounded-full">
              {project.location}
            </span>
            <span className="inline-flex px-2.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-extrabold uppercase tracking-wider rounded-full">
              {project.code}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-sm mb-1">
            {project.name}
          </h1>
          <p className="text-slate-300 text-xs max-w-4xl font-medium leading-relaxed">
            {project.description || "Monitoring of ongoing and completed engineering infrastructure sub-programs across local communities."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
