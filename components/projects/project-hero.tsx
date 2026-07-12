"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

import type { ProjectDetail } from "@/types";
import { ProjectShareButton } from "@/components/projects/project-share-button";
import { getBlurDataURL } from "@/lib/image-utils";
import { useTranslation } from "@/i18n";

interface ProjectHeroProps {
  project: ProjectDetail;
}

export function ProjectHero({ project }: ProjectHeroProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  // Extract all images from geotags
  const metadata = project.metadata as any;
  const projectImages = (metadata?.geotag || [])
    .map((tag: any) => tag.url)
    .filter(Boolean);

  // Fallback if no images
  const images = projectImages.length > 0 ? projectImages : ["/hero/main-background.png", "/hero/top_left.jpg", "/hero/lower_right.jpg"];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Cycle through images every 3 seconds
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative h-[450px] md:h-[400px] overflow-hidden bg-slate-900 dark:bg-slate-950">
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={images[currentIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentIndex]}
              alt={`${project.name} - Photo ${currentIndex + 1}`}
              fill
              className="object-cover"
              priority
              quality={85}
              placeholder="blur"
              blurDataURL={getBlurDataURL(1920, 1080)}
              sizes="100vw"
              unoptimized={images[currentIndex].startsWith('http')}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-slate-900/70 dark:from-slate-950/80 dark:via-slate-900/70 dark:to-slate-950/80" />

      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between py-6 pb-12 md:py-8 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex items-center justify-between"
        >
          <Link href={`/projects${queryString ? `?${queryString}` : ""}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{t("projectDetail.backToProjects")}</span>
          </Link>
          <ProjectShareButton projectId={project.id} projectName={project.name} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="inline-block px-3 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
              {project.location}
            </div>
            {images.length > 1 && (
              <div className="inline-block px-3 py-1 bg-black/30 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight drop-shadow-md">{project.name}</h1>
          <p className="text-white/90 text-sm md:text-xs max-w-3xl mb-4 line-clamp-2 md:line-clamp-3 drop-shadow-sm font-medium leading-relaxed">
            {project.description || t("projectDetail.monitoringFallback")
              .replace("{name}", project.name)
              .replace("{location}", project.location)}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
