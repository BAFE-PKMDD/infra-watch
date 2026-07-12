"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Star,
  User,
  Play,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { MediaViewer } from "@/components/ui/media-viewer";
import { FeedbackCommentList } from "@/components/projects/feedback-comment-list";
import { FeedbackCommentForm } from "@/components/projects/feedback-comment-form";
import { FeedbackCommentSkeleton } from "@/components/projects/feedback-comment-skeleton";
import { voteFeedback } from "@/actions/mutation/feedback-vote.mutation";
import { getUserVotes } from "@/actions/query/feedback-votes.query";
import { getFeedbackComments } from "@/actions/query/feedback-comments.query";
import { useAuth } from "@/providers/auth-provider";
import type { FeedbackFeedItem, FeedbackFeedComment } from "@/types/feedback.types";
import { ProjectPreviewSheet } from "@/components/feedback-feed/project-preview-sheet";

const categoryLabels: Record<string, string> = {
  quality: "Project Quality",
  progress: "Project Progress",
  concerns: "Concerns & Issues",
  general: "General Feedback",
};

const categoryColors: Record<string, string> = {
  quality: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  progress: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  concerns: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  general: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface FeedbackFeedCardProps {
  item: FeedbackFeedItem;
}

export function FeedbackFeedCard({ item }: FeedbackFeedCardProps) {
  const { user: currentUser } = useAuth();
  const displayName = item.isAnonymous ? "Anonymous User" : (item.user?.name || "Citizen");
  const userImage = !item.isAnonymous ? item.user?.image : null;

  // Voting state
  const [votingType, setVotingType] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState({
    helpfulCount: item.helpfulCount,
    unhelpfulCount: item.unhelpfulCount,
  });
  const [userVote, setUserVote] = useState<"helpful" | "unhelpful" | null>(null);

  // Media state
  const [viewingMediaIndex, setViewingMediaIndex] = useState<number | null>(null);

  // Comments state
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [allComments, setAllComments] = useState<any[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(item.commentCount);

  // Project preview state
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);

  // Fetch user vote on mount
  useEffect(() => {
    if (currentUser) {
      getUserVotes([item.id]).then((result) => {
        if (result.success && result.data[item.id]) {
          setUserVote(result.data[item.id]);
        }
      }).catch(() => { });
    }
  }, [item.id, currentUser]);

  // Handle voting
  const handleVote = async (voteType: "helpful" | "unhelpful") => {
    setVotingType(voteType);
    try {
      const result = await voteFeedback({ feedbackId: item.id, voteType });
      setVoteCounts({
        helpfulCount: result.data.helpfulCount,
        unhelpfulCount: result.data.unhelpfulCount,
      });
      setUserVote(result.data.userVote as "helpful" | "unhelpful" | null);
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVotingType(null);
    }
  };

  // Load all comments
  const loadAllComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const result = await getFeedbackComments(item.id);
      if (result.success) {
        setAllComments(result.data);
        setCommentCount(result.data.length);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoadingComments(false);
    }
  }, [item.id]);

  const toggleComments = async () => {
    if (commentsExpanded) {
      setCommentsExpanded(false);
    } else {
      setCommentsExpanded(true);
      if (!allComments) {
        await loadAllComments();
      }
    }
  };

  // Build media items for the viewer
  const mediaItems = (item.media || [])
    .map((m) => ({
      url: getFullUrl(m.url),
      type: m.type,
      caption: m.caption,
    }))
    .filter((m): m is { url: string; type: "image" | "video"; caption: string | undefined } => m.url !== null);

  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
      {/* Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white dark:ring-slate-900">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">
                  {getInitials(displayName)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="whitespace-nowrap">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
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

          {/* Category badge */}
          {/* <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap self-start flex-shrink-0 ${categoryColors[item.category] || categoryColors.general
              }`}
          >
            {categoryLabels[item.category] || item.category}
          </span> */}
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="flex items-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${star <= item.rating!
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300 dark:text-slate-600"
                  }`}
              />
            ))}
          </div>
        )}

        {/* Feedback text */}
        <p className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed">
          {item.comment}
        </p>

        {/* Media attachments — always visible */}
        {item.media && item.media.length > 0 && (
          <div className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.media.map((mediaItem, index) => {
                const mediaUrl = getFullUrl(mediaItem.url);
                return (
                  <motion.div
                    key={index}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e3a5f]/30 bg-slate-100 dark:bg-[#0d1526] cursor-pointer shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setViewingMediaIndex(index)}
                  >
                    {mediaItem.type === "image" && mediaUrl ? (
                      <Image
                        src={mediaUrl}
                        alt={mediaItem.caption || `Attachment ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized={isLocalMinIO(mediaUrl)}
                      />
                    ) : mediaItem.type === "video" && mediaUrl ? (
                      <div className="relative w-full h-full">
                        <video
                          src={`${mediaUrl}#t=0.1`}
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
                );
              })}
            </div>
          </div>
        )}

        {/* Action bar: Vote + Comment toggle */}
        <div className="flex items-center gap-2 sm:gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a5f]/20">
          {/* Helpful */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote("helpful")}
              disabled={!!votingType}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${userVote === "helpful"
                ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20"
                : "text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                }`}
              aria-label="Mark as helpful"
            >
              <ThumbsUp
                className={`w-4 h-4 ${userVote === "helpful" ? "fill-current" : ""}`}
              />
            </button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[12px]">
              {voteCounts.helpfulCount}
            </span>
          </div>

          {/* Unhelpful */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote("unhelpful")}
              disabled={!!votingType}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${userVote === "unhelpful"
                ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                : "text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
              aria-label="Mark as unhelpful"
            >
              <ThumbsDown
                className={`w-4 h-4 ${userVote === "unhelpful" ? "fill-current" : ""}`}
              />
            </button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[12px]">
              {voteCounts.unhelpfulCount}
            </span>
          </div>

          {/* Comments toggle */}
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {commentCount} Comment{commentCount !== 1 ? "s" : ""}
            </span>
            {commentsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {commentsExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 dark:border-[#1e3a5f]/20 pt-3 space-y-3 bg-slate-50/50 dark:bg-[#080d16]/55">
              {/* Comment form (for authenticated users) */}
              <FeedbackCommentForm
                feedbackId={item.id}
                onCommentAdded={() => {
                  loadAllComments();
                }}
              />

              {/* Comments list */}
              {loadingComments ? (
                <FeedbackCommentSkeleton />
              ) : allComments ? (
                <FeedbackCommentList
                  comments={allComments}
                  onCommentUpdated={() => loadAllComments()}
                />
              ) : (
                // Show recent comments from the pre-loaded data
                item.recentComments.length > 0 && (
                  <div className="space-y-2">
                    {item.recentComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-[#0d1526] border border-transparent dark:border-[#1e3a5f]/10"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                          {comment.user.image ? (
                            <Image
                              src={comment.user.image}
                              alt={comment.user.name || "User"}
                              width={28}
                              height={28}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-[10px] font-bold">
                              {getInitials(comment.user.name || "U")}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {comment.user.name || "User"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(comment.createdAt), "MMM d")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {comment.comment}
                          </p>
                        </div>
                      </div>
                    ))}
                    {commentCount > item.recentComments.length && (
                      <button
                        onClick={loadAllComments}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pl-2"
                      >
                        View all {commentCount} comments
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media viewer */}
      {viewingMediaIndex !== null && (
        <MediaViewer
          media={mediaItems}
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
