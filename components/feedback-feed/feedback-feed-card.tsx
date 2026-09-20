"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Star,
  Play,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
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

function FeedImageAttachment({
  src,
  alt,
  unoptimized,
}: {
  src: string;
  alt: string;
  unoptimized: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-2 text-center text-slate-600 dark:text-slate-400">
        <ImageIcon className="size-5 mb-1 text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-medium">Image unavailable</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, 33vw"
      unoptimized={unoptimized}
      onError={() => setHasError(true)}
    />
  );
}

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
  const [allComments, setAllComments] = useState<FeedbackFeedComment[] | null>(null);
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
    <div className="bg-white dark:bg-[#0d1526] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-shadow hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
      {/* Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white dark:ring-slate-900">
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
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <span className="whitespace-nowrap">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                {item.project && (
                  <>
                    <span className="text-slate-400 dark:text-slate-500">·</span>
                    <button
                      type="button"
                      onClick={() => setPreviewProjectId(item.project!.id)}
                      className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 hover:underline truncate max-w-[240px] sm:max-w-[360px] md:max-w-[480px] cursor-pointer"
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
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="flex items-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${star <= item.rating!
                  ? "fill-amber-500 text-amber-500"
                  : "text-slate-300 dark:text-slate-600"
                  }`}
              />
            ))}
          </div>
        )}

        {/* Feedback text */}
        <p className="text-sm sm:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed">
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
                    className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setViewingMediaIndex(index)}
                  >
                    {mediaItem.type === "image" && mediaUrl ? (
                      <FeedImageAttachment
                        src={mediaUrl}
                        alt={mediaItem.caption || `Attachment ${index + 1}`}
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
