"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  MapPin,
  ArrowUpRight,
  MessageCircle,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { IssueActivityItem } from "@/types/activity-feed.types";
import { ProjectPreviewSheet } from "@/components/feedback-feed/project-preview-sheet";
import { getAnonymousUser } from "@/lib/anonymous-identifier";
import { AnonymousIcon } from "@/components/shared/anonymous-avatar";
import { translateStatusLabel } from "@/components/shared/system-evidence-map-format";
import { useTranslation } from "@/i18n";
import { SocialShareMenu } from "./social-share-menu";
import { PostOptionsMenu } from "./post-options-menu";

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
  const { t } = useTranslation();
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [isExpandedText, setIsExpandedText] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const anon = useMemo(() => getAnonymousUser(item.id), [item.id]);
  const displayName = t("community.issueCard.reporterName", { number: anon.number });
  const locationText = [item.barangay, item.city, item.province].filter(Boolean).join(", ");
  const responseCount = Math.max(item.responseCount, item.recentResponses.length);
  const isLongText = (item.issueDescription || "").length > 280;
  const displayText = isLongText && !isExpandedText ? `${item.issueDescription.slice(0, 280)}...` : item.issueDescription;

  if (isHidden) {
    return (
      <div className="bg-slate-100/80 dark:bg-slate-900/40 rounded-xl p-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60">
        <span>{t("community.issueCard.hidden")}</span>
        <button
          type="button"
          onClick={() => setIsHidden(false)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          {t("community.common.undo")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200">
      {/* Facebook-style Card Header */}
      <div className="p-4 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Reporter avatar */}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${anon.gradient} flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ${anon.ringColor} shadow-xs`}
          >
            <AnonymousIcon
              name={anon.iconName}
              className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow-xs"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[15px] text-slate-900 dark:text-white leading-tight">
                {displayName}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                <AlertTriangle className="w-3 h-3" />
                {t("community.issueCard.reportedIssue")}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="whitespace-nowrap">
                {format(new Date(item.createdAt), "MMM d, yyyy")}
              </span>
              <span className="text-slate-400 dark:text-slate-600">·</span>
              <span title={t("community.issueCard.publicReport")} className="inline-flex items-center">
                <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </span>
              {item.project && (
                <>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setPreviewProjectId(item.project!.id)}
                    className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate max-w-[200px] sm:max-w-[320px] md:max-w-[420px] cursor-pointer"
                    title={item.project.name}
                  >
                    <MapPin className="w-3 h-3 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{item.project.name}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Facebook 3-dots action menu */}
        <PostOptionsMenu
          postId={item.id}
          postType="issue"
          projectName={item.project?.name}
          onViewProject={item.project ? () => setPreviewProjectId(item.project!.id) : undefined}
          onHidePost={() => setIsHidden(true)}
        />
      </div>

      {/* Issue description */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-[15px] sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed break-words whitespace-pre-line">
          {displayText}
        </p>
        {isLongText && (
          <button
            type="button"
            onClick={() => setIsExpandedText((prev) => !prev)}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline mt-1 cursor-pointer"
          >
            {isExpandedText ? t("community.common.seeLess") : t("community.common.seeMore")}
          </button>
        )}

        {/* Location badge */}
        {locationText && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>{locationText}</span>
          </div>
        )}
      </div>

      {/* Engagement Counter */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
            {t("community.issueCard.status", { status: translateStatusLabel(item.status || "pending", t) })}
          </span>
        </div>

        {responseCount > 0 && (
          <button
            type="button"
            onClick={() => setResponsesExpanded((prev) => !prev)}
            className="hover:underline cursor-pointer font-medium"
          >
            {t(responseCount !== 1 ? "community.issueCard.responsesMany" : "community.issueCard.responsesOne", { count: responseCount })}
          </button>
        )}
      </div>

      {/* Facebook Action Bar */}
      <div className="mx-4 py-1 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1">
        {/* View Details link */}
        <Link
          href={`/report-issue/${item.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>{t("community.issueCard.viewDetails")}</span>
        </Link>

        {/* Responses toggle */}
        <button
          type="button"
          onClick={() => setResponsesExpanded((prev) => !prev)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            responsesExpanded
              ? "text-[#1877F2] dark:text-[#3982f6] bg-blue-50/70 dark:bg-blue-950/40 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
          }`}
        >
          <MessageCircle className="w-4.5 h-4.5" />
          <span>{t("community.issueCard.responses")}</span>
        </button>

        {/* Social Share Menu (Facebook, X, WhatsApp, LinkedIn, Telegram, Device, Copy) */}
        <SocialShareMenu
          url={`/citizen-feed#issue-${item.id}`}
          title={t("community.issueCard.shareTitle", { project: item.project?.name || "INFRA Watch" })}
          text={item.issueDescription || undefined}
        />
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
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-[#070b14]/70">
              {item.recentResponses.length > 0 ? (
                <>
                  {item.recentResponses.map((response) => (
                    <div
                      key={response.id}
                      className="flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold shadow-2xs">
                        {getInitials(response.responderName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="inline-block bg-white dark:bg-[#0d1526] px-3.5 py-2 rounded-[18px] border border-slate-200/60 dark:border-slate-800/60 shadow-2xs max-w-[95%]">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {response.responderName}
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed break-words whitespace-pre-line">
                            {response.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 px-3 mt-0.5 text-[10px] text-slate-400 font-medium">
                          <span>{format(new Date(response.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {item.responseCount > item.recentResponses.length && (
                    <Link
                      href={`/report-issue/${item.id}`}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pl-2 inline-block pt-1"
                    >
                      {t("community.issueCard.viewAllResponses", { count: item.responseCount })}
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                  {t("community.issueCard.noResponses")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project preview sheet */}
      <ProjectPreviewSheet
        projectId={previewProjectId}
        open={!!previewProjectId}
        onOpenChange={(open) => !open && setPreviewProjectId(null)}
      />
    </div>
  );
}
