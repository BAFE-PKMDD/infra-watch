"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowRight, Building2, Calendar, Clock, Ruler, Banknote, HardHat, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { motion, AnimatePresence } from "motion/react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import useMediaQuery from "@/hooks/use-media-query";
import { getProjectPreview } from "@/actions/query/project-preview.query";
import { formatCurrency } from "@/lib/format";
import { getBlurDataURL } from "@/lib/image-utils";
import type { ProjectDetail } from "@/types";

interface ProjectPreviewSheetProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DESKTOP_BREAKPOINT = "(min-width: 768px)";

// ─── Field Component ───────────────────────────────────
function InfoField({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-slate-900 dark:text-white truncate ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────
function PreviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4" />
      <div className="space-y-3 px-1">
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared Content ─────────────────────────────────────
function PreviewContent({
  project,
  loading,
  onClose,
}: {
  project: ProjectDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  // Extract all geotag images
  const metadata = project?.metadata as any;
  const images: string[] = (metadata?.geotag || [])
    .map((tag: any) => tag.url)
    .filter(Boolean);
  const hasImages = images.length > 0;
  const allImages = hasImages ? images : ["/hero-road.jpg"];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle every 4 seconds
  useEffect(() => {
    if (allImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [allImages.length]);

  // Reset index when project changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [project?.id]);

  const goToPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    },
    [allImages.length],
  );

  const goToNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    },
    [allImages.length],
  );

  // Implementing agency logic
  const implementingAgency = project?.implementingAgency || "";

  if (loading || !project) {
    return (
      <div className="p-5">
        <PreviewSkeleton />
      </div>
    );
  }

  return (
    <>
      {/* Hero Carousel */}
      <div className="relative h-44 sm:h-48 bg-sky-700 dark:bg-slate-950 overflow-hidden flex-shrink-0 group">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={allImages[currentIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={allImages[currentIndex]}
              alt={`${project.name} - Photo ${currentIndex + 1}`}
              fill
              className="object-cover"
              sizes="480px"
              quality={80}
              placeholder="blur"
              blurDataURL={getBlurDataURL(480, 200)}
              unoptimized={allImages[currentIndex].startsWith("http")}
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-black/40" />

        {/* Carousel Controls */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 z-[1]">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="inline-block px-2.5 py-0.5 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
              {project.location}
            </span>
            {allImages.length > 1 && (
              <span className="inline-block px-2.5 py-0.5 bg-black/30 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10">
                {currentIndex + 1} / {allImages.length}
              </span>
            )}
            {project.stage && (
              <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/10">
                {project.stage}
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
            {project.name}
          </h2>
        </div>

        {/* Dot Indicators */}
        {allImages.length > 1 && allImages.length <= 8 && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[2] flex gap-1">
            {allImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex
                  ? "bg-white w-3"
                  : "bg-white/40 hover:bg-white/60"
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlights Grid */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <InfoField icon={Layers} label="Project Code" value={project.code} mono />
          <InfoField icon={Calendar} label="Start Date" value={project.startDate} />
          <InfoField
            icon={Calendar}
            label="Completion"
            value={project.actualCompletionDate || project.completionDate}
          />
          <InfoField icon={Clock} label="Duration" value={project.duration} />
          <InfoField icon={Banknote} label="Budget" value={formatCurrency(project.budget)} />
          <InfoField
            icon={Ruler}
            label={project.postGeotaggedLength ? "Post-Geotagged" : "Target Length"}
            value={
              project.postGeotaggedLength
                ? `${parseFloat(project.postGeotaggedLength).toFixed(2)} km`
                : project.projectLength
            }
          />
          <InfoField icon={HardHat} label="Contractor" value={project.contractor} />
          <InfoField icon={MapPin} label="Region" value={project.region || "N/A"} />
        </div>

        {/* Implementing Agency */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <InfoField icon={Building2} label="Implementing Agency" value={implementingAgency} />
        </div>

        {/* View Full Project Link */}
        <Link
          href={`/projects/${project.id}`}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
          onClick={onClose}
        >
          View Full Project
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────
export function ProjectPreviewSheet({ projectId, open, onOpenChange }: ProjectPreviewSheetProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);

  useEffect(() => {
    if (open && projectId) {
      setLoading(true);
      setProject(null);
      getProjectPreview(projectId).then((result) => {
        if (result.success && result.data) {
          setProject(result.data);
        }
        setLoading(false);
      });
    }
  }, [open, projectId]);

  const handleClose = () => onOpenChange(false);

  // ─── Desktop: shadcn Sheet (right slide-in) ─────────
  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>{project?.name || "Project Preview"}</SheetTitle>
            <SheetDescription>Project details preview</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto h-full">
            <PreviewContent project={project} loading={loading} onClose={handleClose} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ─── Mobile: vaul Drawer (bottom sheet) ─────────────
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-background border-t max-h-[85vh]">
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
          <DrawerPrimitive.Title className="sr-only">
            {project?.name || "Project Preview"}
          </DrawerPrimitive.Title>
          <DrawerPrimitive.Description className="sr-only">
            Project details preview
          </DrawerPrimitive.Description>
          <div className="overflow-y-auto flex-1">
            <PreviewContent project={project} loading={loading} onClose={handleClose} />
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
