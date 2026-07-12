"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import {
  MapPin,
  ArrowUpRight,
  MessageSquare,
  Play,
  AlertTriangle,
  Droplets,
  Construction,
  ShieldAlert,
  Shield,
  Slash,
  HelpCircle,
  Hammer,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { MediaViewer } from "@/components/ui/media-viewer";
import type { IssueActivityItem } from "@/types/activity-feed.types";
import { ProjectPreviewSheet } from "@/components/feedback-feed/project-preview-sheet";

const ISSUE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof AlertTriangle }
> = {
  damage: {
    label: "Road Damage",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
  stopped: {
    label: "Stalled Project",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    icon: Slash,
  },
  safety: {
    label: "Safety Hazard",
    color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    icon: ShieldAlert,
  },
  flooding: {
    label: "Flooding",
    color: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    icon: Droplets,
  },
  blocked: {
    label: "Road Blocked",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    icon: Construction,
  },
  quality: {
    label: "Quality Issue",
    color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
    icon: Hammer,
  },
  other: {
    label: "Other",
    color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    icon: HelpCircle,
  },
};

// ─── Helpers ───────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ─────────────────────────────────────────

interface IssueFeedCardProps {
  item: IssueActivityItem;
}

export function IssueFeedCard({ item }: IssueFeedCardProps) {
  const [viewingMediaIndex, setViewingMediaIndex] = useState<number | null>(null);
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);

  const displayName = item.isAnonymous ? "Anonymous Citizen" : item.reporterName;
  const typeCfg = ISSUE_TYPE_CONFIG[item.issueType] || ISSUE_TYPE_CONFIG.other;
  const TypeIcon = typeCfg.icon;

  // Build media items for the viewer
  const allMedia: { url: string; type: "image" | "video"; caption?: string }[] = [
    ...(item.photoUrls || []).map((url) => ({
      url: getFullUrl(url)!,
      type: "image" as const,
    })),
    ...(item.videoUrls || []).map((url) => ({
      url: getFullUrl(url)!,
      type: "video" as const,
    })),
  ].filter((m) => m.url != null);

  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Reporter avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white dark:ring-slate-900">
              <span className="text-white text-xs font-bold">
                {getInitials(displayName)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="whitespace-nowrap">
                  {format(new Date(item.createdAt), "MMM d, yyyy")}
                </span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  Reported Issue
                </span>
                {item.project && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setPreviewProjectId(item.project!.id)}
                      className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline truncate max-w-[140px] sm:max-w-[200px] cursor-pointer"
                      title={item.project.name}
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.project.name}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badges */}
          {/* <div className="flex items-center gap-1.5 flex-shrink-0 self-start">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeCfg.color}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeCfg.label}
            </span>
          </div> */}
        </div>

        {/* Issue description */}
        <p className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 mb-2">
          {item.issueDescription}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>
            {item.barangay}, {item.city}, {item.province}
          </span>
          {item.streetLandmark && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="truncate max-w-[200px]">{item.streetLandmark}</span>
            </>
          )}
        </div>

        {/* Evidence photos */}
        {allMedia.length > 0 && (
          <div className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allMedia.slice(0, 6).map((mediaItem, index) => (
                <motion.div
                  key={index}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e3a5f]/30 bg-slate-100 dark:bg-[#0d1526] cursor-pointer shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setViewingMediaIndex(index)}
                >
                  {mediaItem.type === "image" && mediaItem.url ? (
                    <Image
                      src={mediaItem.url}
                      alt={`Evidence ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                      unoptimized={isLocalMinIO(mediaItem.url)}
                    />
                  ) : mediaItem.type === "video" && mediaItem.url ? (
                    <div className="relative w-full h-full">
                      <video
                        src={`${mediaItem.url}#t=0.1`}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a5f]/20">
          {/* View details link */}
          <Link
            href={`/report-issue/${item.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
          >
            View Details
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Responses toggle */}
          <button
            onClick={() => setResponsesExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {Math.max(item.responseCount, item.recentResponses.length)} Response{Math.max(item.responseCount, item.recentResponses.length) !== 1 ? "s" : ""}
            </span>
            {responsesExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Responses section (expandable) */}
      <AnimatePresence>
        {responsesExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 dark:border-[#1e3a5f]/20 pt-3 space-y-2 bg-slate-50/50 dark:bg-[#080d16]/55">
              {item.recentResponses.length > 0 ? (
                <>
                  {item.recentResponses.map((response) => (
                    <div
                      key={response.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-[#0d1526] border border-transparent dark:border-[#1e3a5f]/10"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-bold">
                          {getInitials(response.responderName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {response.responderName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(response.createdAt), "MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {response.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  {item.responseCount > item.recentResponses.length && (
                    <Link
                      href={`/report-issue/${item.id}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pl-2"
                    >
                      View all {item.responseCount} responses
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                  No responses yet
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media viewer */}
      {viewingMediaIndex !== null && (
        <MediaViewer
          media={allMedia}
          initialIndex={viewingMediaIndex}
          open={viewingMediaIndex !== null}
          onClose={() => setViewingMediaIndex(null)}
        />
      )}

      {/* Project preview sheet */}
      <ProjectPreviewSheet
        projectId={previewProjectId}
        open={!!previewProjectId}
        onOpenChange={(open) => !open && setPreviewProjectId(null)}
      />
    </div>
  );
}
