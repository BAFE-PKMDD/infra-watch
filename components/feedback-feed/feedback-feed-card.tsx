"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Star,
  Play,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Image as ImageIcon,
  Globe,
  MoreHorizontal,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { MediaViewer } from "@/components/ui/media-viewer";
import { FeedbackCommentList } from "@/components/projects/feedback-comment-list";
import { FeedbackCommentForm } from "@/components/projects/feedback-comment-form";
import { FeedbackCommentSkeleton } from "@/components/projects/feedback-comment-skeleton";
import { voteFeedback } from "@/actions/mutation/feedback-vote.mutation";
import { getUserVotes } from "@/actions/query/feedback-votes.query";
import { getFeedbackComments } from "@/actions/query/feedback-comments.query";
import { useAuth } from "@/providers/auth-provider";
import { getAnonymousUser } from "@/lib/anonymous-identifier";
import { AnonymousIcon } from "@/components/shared/anonymous-avatar";
import type { FeedbackFeedItem, FeedbackFeedComment } from "@/types/feedback.types";
import { ProjectPreviewSheet } from "@/components/feedback-feed/project-preview-sheet";
import { SocialShareMenu } from "./social-share-menu";
import { PostOptionsMenu } from "./post-options-menu";

function FeedImageAttachment({
  src,
  alt,
  unoptimized,
  className = "object-cover",
}: {
  src: string;
  alt: string;
  unoptimized: boolean;
  className?: string;
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
      className={`transition-transform duration-300 group-hover:scale-[1.01] ${className}`}
      sizes="(max-width: 768px) 100vw, 680px"
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
  const isAnonymous = item.isAnonymous || !item.user;
  const anon = useMemo(() => getAnonymousUser(item.userId || item.id), [item.userId, item.id]);
  const displayName = isAnonymous ? anon.displayName : (item.user?.name || "Citizen");
  const userImage = !isAnonymous ? item.user?.image : null;

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

  // Text expansion for long comments (Facebook style)
  const [isExpandedText, setIsExpandedText] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const isLongText = Boolean(item.comment && item.comment.length > 280);
  const displayText = isLongText && !isExpandedText ? `${item.comment.slice(0, 280)}...` : item.comment;

  // Handle share / copy link
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

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
      url: m.url,
      type: m.type,
      caption: m.caption,
    }))
    .filter((m): m is { url: string; type: "image" | "video"; caption: string | undefined } => Boolean(m.url));

  if (isHidden) {
    return (
      <div className="bg-white dark:bg-[#0d1526] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Post hidden from your feed.</span>
        <button
          type="button"
          onClick={() => setIsHidden(false)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0d1526] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200">
      {/* Facebook-style Card Header */}
      <div className="p-4 pb-2.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* User Avatar */}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${
              isAnonymous ? anon.gradient : "bg-gradient-to-br from-emerald-600 to-teal-700"
            } flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ${
              isAnonymous ? anon.ringColor : "ring-slate-200 dark:ring-slate-700"
            } shadow-xs`}
          >
            {userImage ? (
              <Image
                src={userImage}
                alt={displayName}
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            ) : isAnonymous ? (
              <AnonymousIcon
                name={anon.iconName}
                className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white drop-shadow-xs"
              />
            ) : (
              <span className="text-white text-xs sm:text-sm font-bold tracking-wider">
                {getInitials(displayName)}
              </span>
            )}
          </div>

          {/* User info & project attribution */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[15px] text-slate-900 dark:text-white leading-tight">
                {displayName}
              </span>

              {isAnonymous && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  Anonymous Citizen
                </span>
              )}

              {/* Star rating pill next to name */}
              {item.rating && (
                <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= item.rating!
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Subline: Date · Globe · Project check-in */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="whitespace-nowrap">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
              <span className="text-slate-400 dark:text-slate-400">·</span>
              <span title="Public post" className="inline-flex items-center">
                <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
              </span>
              {item.project && (
                <>
                  <span className="text-slate-400 dark:text-slate-400">·</span>
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
          postType="feedback"
          projectName={item.project?.name}
          onViewProject={item.project ? () => setPreviewProjectId(item.project!.id) : undefined}
          onHidePost={() => setIsHidden(true)}
        />
      </div>

      {/* Feedback text */}
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
            {isExpandedText ? "See less" : "See more"}
          </button>
        )}
      </div>

      {/* Media attachments — Facebook full-width prominent layout */}
      {item.media && item.media.length > 0 && (
        <div className="w-full bg-slate-100 dark:bg-slate-900 overflow-hidden select-none">
          {/* Single Media Item */}
          {item.media.length === 1 && (() => {
            const mediaItem = item.media[0];
            const mediaUrl = getFullUrl(mediaItem.url);
            if (!mediaUrl) return null;

            if (mediaItem.type === "video") {
              return (
                <div
                  onClick={() => setViewingMediaIndex(0)}
                  className="relative w-full aspect-video bg-black flex items-center justify-center cursor-pointer group"
                >
                  <video
                    src={`${mediaUrl}#t=0.1`}
                    className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-slate-900 dark:text-white ml-0.5 fill-current" />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                onClick={() => setViewingMediaIndex(0)}
                className="relative w-full min-h-[300px] sm:min-h-[380px] max-h-[540px] h-[340px] sm:h-[440px] md:h-[480px] bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer group"
              >
                {/* Ambient blurred backdrop so any aspect ratio looks rich and native */}
                <Image
                  src={mediaUrl}
                  alt=""
                  fill
                  className="object-cover blur-2xl opacity-35 scale-110 pointer-events-none"
                  unoptimized={isLocalMinIO(mediaUrl)}
                  aria-hidden="true"
                />
                {/* Main image prominent and full */}
                <div className="relative w-full h-full z-10 flex items-center justify-center">
                  <FeedImageAttachment
                    src={mediaUrl}
                    alt={mediaItem.caption || "Feedback image"}
                    unoptimized={isLocalMinIO(mediaUrl)}
                    className="object-contain"
                  />
                </div>
              </div>
            );
          })()}

          {/* 2 Media Items */}
          {item.media.length === 2 && (
            <div className="grid grid-cols-2 gap-0.5 w-full h-[280px] sm:h-[360px]">
              {item.media.map((mediaItem, index) => {
                const mediaUrl = getFullUrl(mediaItem.url);
                return (
                  <div
                    key={index}
                    onClick={() => setViewingMediaIndex(index)}
                    className="relative w-full h-full overflow-hidden cursor-pointer group bg-slate-950"
                  >
                    {mediaUrl && (
                      <FeedImageAttachment
                        src={mediaUrl}
                        alt={mediaItem.caption || `Attachment ${index + 1}`}
                        unoptimized={isLocalMinIO(mediaUrl)}
                        className="object-cover"
                      />
                    )}
                    {mediaItem.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-slate-900 ml-0.5 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3 Media Items (Facebook collage: 1 large left, 2 stacked right) */}
          {item.media.length === 3 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-[320px] sm:h-[420px]">
              {item.media.map((mediaItem, index) => {
                const mediaUrl = getFullUrl(mediaItem.url);
                return (
                  <div
                    key={index}
                    onClick={() => setViewingMediaIndex(index)}
                    className={`relative w-full h-full overflow-hidden cursor-pointer group bg-slate-950 ${
                      index === 0 ? "row-span-2" : ""
                    }`}
                  >
                    {mediaUrl && (
                      <FeedImageAttachment
                        src={mediaUrl}
                        alt={mediaItem.caption || `Attachment ${index + 1}`}
                        unoptimized={isLocalMinIO(mediaUrl)}
                        className="object-cover"
                      />
                    )}
                    {mediaItem.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-slate-900 ml-0.5 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 4 or more Media Items (Facebook 2x2 grid with overlay on 4th if > 4) */}
          {item.media.length >= 4 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-[320px] sm:h-[420px]">
              {item.media.slice(0, 4).map((mediaItem, index) => {
                const mediaUrl = getFullUrl(mediaItem.url);
                const isExtra = index === 3 && item.media!.length > 4;
                return (
                  <div
                    key={index}
                    onClick={() => setViewingMediaIndex(index)}
                    className="relative w-full h-full overflow-hidden cursor-pointer group bg-slate-950"
                  >
                    {mediaUrl && (
                      <FeedImageAttachment
                        src={mediaUrl}
                        alt={mediaItem.caption || `Attachment ${index + 1}`}
                        unoptimized={isLocalMinIO(mediaUrl)}
                        className="object-cover"
                      />
                    )}
                    {mediaItem.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-slate-900 ml-0.5 fill-current" />
                        </div>
                      </div>
                    )}
                    {isExtra && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-2xl group-hover:bg-black/70 transition-colors">
                        +{item.media!.length - 3}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Engagement Counters (Facebook style) */}
      {(voteCounts.helpfulCount > 0 || voteCounts.unhelpfulCount > 0 || commentCount > 0) && (
        <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            {voteCounts.helpfulCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-4.5 h-4.5 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
                  <ThumbsUp className="w-2.5 h-2.5 fill-current" />
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {voteCounts.helpfulCount}
                </span>
              </div>
            )}
            {voteCounts.unhelpfulCount > 0 && (
              <div className="flex items-center gap-1 ml-1.5">
                <span className="w-4.5 h-4.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <ThumbsDown className="w-2.5 h-2.5 fill-current" />
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {voteCounts.unhelpfulCount}
                </span>
              </div>
            )}
          </div>

          {commentCount > 0 && (
            <button
              type="button"
              onClick={toggleComments}
              className="hover:underline cursor-pointer font-medium"
            >
              {commentCount} comment{commentCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Facebook Action Bar */}
      <div className="mx-4 py-1 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1">
        {/* Helpful */}
        <button
          type="button"
          onClick={() => handleVote("helpful")}
          disabled={!!votingType}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
            userVote === "helpful"
              ? "text-[#1877F2] dark:text-[#3982f6] bg-blue-50/70 dark:bg-blue-950/40 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
          }`}
          aria-label="Mark as helpful"
        >
          <ThumbsUp
            className={`w-4.5 h-4.5 transition-transform ${
              userVote === "helpful" ? "fill-[#1877F2] text-[#1877F2] scale-110" : "text-slate-500 dark:text-slate-400"
            }`}
          />
          <span>Helpful</span>
        </button>

        {/* Unhelpful */}
        <button
          type="button"
          onClick={() => handleVote("unhelpful")}
          disabled={!!votingType}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
            userVote === "unhelpful"
              ? "text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
          }`}
          aria-label="Mark as unhelpful"
        >
          <ThumbsDown
            className={`w-4.5 h-4.5 transition-transform ${
              userVote === "unhelpful" ? "fill-rose-600 text-rose-600 scale-110" : "text-slate-500 dark:text-slate-400"
            }`}
          />
          <span>Unhelpful</span>
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={toggleComments}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            commentsExpanded
              ? "text-[#1877F2] dark:text-[#3982f6] bg-blue-50/70 dark:bg-blue-950/40 font-bold"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
          }`}
        >
          <MessageCircle className="w-4.5 h-4.5" />
          <span>Comment</span>
        </button>

        {/* Social Share Menu (Facebook, X, WhatsApp, LinkedIn, Telegram, Device, Copy) */}
        <SocialShareMenu
          url={`/citizen-feed#feedback-${item.id}`}
          title={`Citizen Feedback on ${item.project?.name || "INFRA Watch"}`}
          text={item.comment || undefined}
        />
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
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-[#070b14]/70">
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
                  <div className="space-y-2.5">
                    {item.recentComments.map((comment) => {
                      const isCommentAnon =
                        !comment.user.name ||
                        comment.user.name === "Citizen" ||
                        comment.user.name === "Anonymous";
                      const commentAnon = isCommentAnon
                        ? getAnonymousUser(comment.userId || comment.id)
                        : null;
                      const commentName = commentAnon
                        ? commentAnon.shortName
                        : comment.user.name || "Citizen";

                      return (
                        <div key={comment.id} className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full ${
                              commentAnon
                                ? commentAnon.gradient
                                : "bg-gradient-to-br from-emerald-600 to-teal-700"
                            } flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold shadow-2xs`}
                          >
                            {comment.user.image ? (
                              <Image
                                src={comment.user.image}
                                alt={commentName}
                                width={32}
                                height={32}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : commentAnon ? (
                              <AnonymousIcon
                                name={commentAnon.iconName}
                                className="w-4 h-4 text-white drop-shadow-xs"
                              />
                            ) : (
                              <span>{getInitials(commentName)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="inline-block bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-[18px] max-w-[95%]">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {commentName}
                              </span>
                              <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed break-words whitespace-pre-line">
                                {comment.comment}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 px-3 mt-0.5 text-[11px] text-slate-500 font-medium">
                              <span>{format(new Date(comment.createdAt), "MMM d")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {commentCount > item.recentComments.length && (
                      <button
                        type="button"
                        onClick={loadAllComments}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pl-2 cursor-pointer"
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
