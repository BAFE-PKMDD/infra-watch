"use client";

import { Star, User, Play, MoreVertical, Pencil, Trash2, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Image as ImageIcon, ThumbsUp, ThumbsDown, MessageSquare, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { MediaViewer } from "@/components/ui/media-viewer";
import Image from "next/image";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { voteFeedback } from "@/actions/mutation/feedback-vote.mutation";
import { getUserVotes } from "@/actions/query/feedback-votes.query";
import { FeedbackVotersModal } from "./feedback-voters-modal";
import { FeedbackCommentForm } from "./feedback-comment-form";
import { FeedbackCommentList } from "./feedback-comment-list";
import { FeedbackCommentSkeleton } from "./feedback-comment-skeleton";
import { getFeedbackComments } from "@/actions/query/feedback-comments.query";
import { FeedbackMedia } from "@/types/feedback.types";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notification-provider";

interface FeedbackItem {
  id: string;
  userId?: string | null;
  rating?: number | null;
  comment: string;
  category: string;
  isAnonymous: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  commentCount?: number;
  createdAt: string | Date;
  media?: FeedbackMedia[];
  user?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
}

interface FeedbackListProps {
  feedbacks: FeedbackItem[];
  onEdit?: (feedback: FeedbackItem) => void;
  onDelete?: (feedbackId: string) => void;
  highlightFeedbackId?: string;
  highlightCommentId?: string;
}

const categoryLabels: Record<string, string> = {
  quality: "Project Quality",
  progress: "Project Progress",
  concerns: "Concerns & Issues",
  general: "General Feedback",
};

const categoryColors: Record<string, string> = {
  quality: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  progress: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  concerns: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  general: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400",
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FeedbackList({
  feedbacks,
  onEdit,
  onDelete,
  highlightFeedbackId,
  highlightCommentId,
}: FeedbackListProps) {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const currentUserId = user?.id;
  const [viewingMediaIndex, setViewingMediaIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedMedia, setCollapsedMedia] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [votingFeedback, setVotingFeedback] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, { helpfulCount: number; unhelpfulCount: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<string, "helpful" | "unhelpful">>({});
  const [votersModalFeedbackId, setVotersModalFeedbackId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const itemsPerPage = 5;
  const feedbackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastNotificationIdRef = useRef<string | null>(null);

  // Fetch user votes when feedbacks change
  useEffect(() => {
    if (feedbacks.length > 0) {
      const feedbackIds = feedbacks.map(f => f.id);
      getUserVotes(feedbackIds).then((result) => {
        if (result.success) {
          setUserVotes(result.data);
        }
      }).catch((error) => {
        console.error("Error fetching user votes:", error);
      });
    }
  }, [feedbacks]);

  // Handle voting
  const handleVote = async (feedbackId: string, voteType: "helpful" | "unhelpful") => {
    setVotingFeedback(feedbackId);

    try {
      const result = await voteFeedback({ feedbackId, voteType });

      // Update local vote counts
      setVoteCounts(prev => ({
        ...prev,
        [feedbackId]: {
          helpfulCount: result.data.helpfulCount,
          unhelpfulCount: result.data.unhelpfulCount,
        },
      }));

      // Update user's vote state
      if (result.data.userVote) {
        setUserVotes(prev => ({
          ...prev,
          [feedbackId]: result.data.userVote as "helpful" | "unhelpful",
        }));
      } else {
        // Vote was removed
        setUserVotes(prev => {
          const newVotes = { ...prev };
          delete newVotes[feedbackId];
          return newVotes;
        });
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVotingFeedback(null);
    }
  };

  // Toggle media collapsed state
  const toggleMediaCollapsed = (feedbackId: string) => {
    setCollapsedMedia(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId);
      } else {
        newSet.add(feedbackId);
      }
      return newSet;
    });
  };

  // Toggle comments expanded state
  const toggleComments = async (feedbackId: string) => {
    const isExpanded = expandedComments.has(feedbackId);

    if (isExpanded) {
      // Collapse comments
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
    } else {
      // Expand comments
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        newSet.add(feedbackId);
        return newSet;
      });

      // Load comments if not already loaded
      if (!comments[feedbackId]) {
        loadComments(feedbackId);
      }
    }
  };

  // Load comments for a feedback
  const loadComments = useCallback(async (feedbackId: string, forceRefetch = false) => {
    setLoadingComments(prev => new Set(prev).add(feedbackId));

    try {
      const result = await getFeedbackComments(feedbackId);
      if (result.success) {
        setComments(prev => ({
          ...prev,
          [feedbackId]: result.data,
        }));
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoadingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
    }
  }, []);

  // Auto-refetch comments when comment_approved or comment_posted notification arrives
  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];
    if (!latestNotification) return;

    // Avoid processing the same notification twice
    if (latestNotification.id === lastNotificationIdRef.current) return;


    // Check if it's a relevant notification type
    const relevantTypes = ["comment_approved", "comment_posted"];
    if (relevantTypes.includes(latestNotification.type)) {
      const metadata = latestNotification.metadata as any;
      const feedbackId = metadata?.feedbackId;

      if (feedbackId && expandedComments.has(feedbackId)) {
        // Refetch comments for this feedback
        loadComments(feedbackId, true);
      }

      lastNotificationIdRef.current = latestNotification.id;
    }
  }, [notifications, expandedComments, loadComments]);


  // Sort feedbacks by createdAt in ascending order
  // Sort feedbacks by createdAt based on sortOrder
  const sortedFeedbacks = useMemo(() =>
    [...feedbacks].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }),
    [feedbacks, sortOrder]
  );

  // Calculate pagination
  const totalPages = Math.ceil(sortedFeedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeedbacks = sortedFeedbacks.slice(startIndex, endIndex);

  // Reset to page 1 when feedbacks change
  useEffect(() => {
    // If we have a highlight feedback, find its page
    if (highlightFeedbackId) {
      const index = sortedFeedbacks.findIndex(f => f.id === highlightFeedbackId);
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1;
        setCurrentPage(page);
        return;
      }
    }
    setCurrentPage(1);
  }, [feedbacks.length, highlightFeedbackId]);

  // Handle highlighting and scrolling
  useEffect(() => {
    if (highlightFeedbackId) {
      // Toggle comments if commentId is provided
      if (highlightCommentId) {
        toggleComments(highlightFeedbackId);
      }

      // Scroll to feedback after a short delay to ensure rendering/pagination
      setTimeout(() => {
        const element = feedbackRefs.current[highlightFeedbackId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightFeedbackId, highlightCommentId, currentPage]);

  // Get all media from current page feedbacks for navigation
  const allMedia = currentFeedbacks.flatMap(feedback =>
    (feedback.media || []).map(item => {
      const url = getFullUrl(item.url);
      return url ? {
        ...item,
        feedbackId: feedback.id,
        url
      } : null;
    })
  ).filter((item): item is { type: 'image' | 'video'; url: string; caption?: string; feedbackId: string } => item !== null);

  // KB navigation is now handled by MediaViewer

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          No Feedback Yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Be the first to share your thoughts!
        </p>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of feedback list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {feedbacks.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="h-8 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            {sortOrder === "asc" ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 mr-1.5" />
                Oldest First
              </>
            ) : (
              <>
                <ArrowDown className="w-3.5 h-3.5 mr-1.5" />
                Newest First
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {currentFeedbacks.map((feedback) => {
          const displayName = feedback.isAnonymous ? "Anonymous User" : (feedback.user?.name || "Citizen");
          const userImage = !feedback.isAnonymous ? feedback.user?.image : null;
          const isOwnFeedback = currentUserId && feedback.userId === currentUserId;

          return (
            <div
              key={feedback.id}
              ref={el => { feedbackRefs.current[feedback.id] = el; }}
              className={`bg-white dark:bg-slate-900 rounded-lg border p-4 hover:shadow-md transition-shadow content-visibility-auto ${highlightFeedbackId === feedback.id && !highlightCommentId
                ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/30 dark:bg-blue-900/10"
                : "border-slate-200 dark:border-slate-800"
                }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* User Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={displayName}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-semibold">
                        {getInitials(displayName)}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-white">
                      {displayName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(feedback.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[feedback.category] || categoryColors.general
                      }`}
                  >
                    {categoryLabels[feedback.category] || feedback.category}
                  </span>

                  {/* Edit/Delete Menu - Only show for own feedback */}
                  {isOwnFeedback && (
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEdit?.(feedback)}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(feedback.id)}
                          className="cursor-pointer text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Rating */}
              {feedback.rating && (
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${star <= feedback.rating!
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-300 dark:text-slate-600"
                        }`}
                    />
                  ))}
                </div>
              )}

              {/* Comment */}
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {feedback.comment}
              </p>

              {/* Voting Icons - Facebook style */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVote(feedback.id, "helpful")}
                    disabled={votingFeedback === feedback.id}
                    className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${userVotes[feedback.id] === "helpful"
                      ? "text-green-600 dark:text-green-400"
                      : "text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                      }`}
                    aria-label="Mark as helpful"
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${userVotes[feedback.id] === "helpful" ? "fill-current" : ""
                        }`}
                    />
                  </button>
                  <button
                    onClick={() => setVotersModalFeedbackId(feedback.id)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:underline transition-colors cursor-pointer"
                  >
                    {voteCounts[feedback.id]?.helpfulCount ?? feedback.helpfulCount}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleVote(feedback.id, "unhelpful")}
                    disabled={votingFeedback === feedback.id}
                    className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${userVotes[feedback.id] === "unhelpful"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                      }`}
                    aria-label="Mark as unhelpful"
                  >
                    <ThumbsDown
                      className={`w-3.5 h-3.5 ${userVotes[feedback.id] === "unhelpful" ? "fill-current" : ""
                        }`}
                    />
                  </button>
                  <button
                    onClick={() => setVotersModalFeedbackId(feedback.id)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors cursor-pointer"
                  >
                    {voteCounts[feedback.id]?.unhelpfulCount ?? feedback.unhelpfulCount}
                  </button>
                </div>
              </div>

              {/* Media Attachments - Expanded by Default */}
              {feedback.media && feedback.media.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleMediaCollapsed(feedback.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors mb-2"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{feedback.media.length} Attachment{feedback.media.length > 1 ? 's' : ''}</span>
                    {!collapsedMedia.has(feedback.id) ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {!collapsedMedia.has(feedback.id) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {feedback.media.map((item, index) => {
                        const mediaUrl = getFullUrl(item.url);
                        const globalIndex = allMedia.findIndex(m => m.url === mediaUrl && m.feedbackId === feedback.id);

                        return (
                          <motion.div
                            key={index}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-sm active:scale-95 transition-transform"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => {
                              const mediaIndex = allMedia.findIndex(m => m.url === getFullUrl(item.url) && m.feedbackId === feedback.id);
                              if (mediaIndex !== -1) setViewingMediaIndex(mediaIndex);
                            }}
                          >
                            {item.type === 'image' && mediaUrl ? (
                              <Image
                                src={mediaUrl}
                                alt={item.caption || `Attachment ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 50vw, 33vw"
                                unoptimized={isLocalMinIO(mediaUrl)}
                              />
                            ) : item.type === 'video' && mediaUrl ? (
                              <div className="relative w-full h-full">
                                <video
                                  src={`${mediaUrl}#t=0.1`}
                                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                                    <Play className="w-6 h-6 text-slate-900 ml-0.5" fill="currentColor" />
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Section - Collapsible */}
              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  onClick={() => toggleComments(feedback.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>
                    {comments[feedback.id]?.length ?? feedback.commentCount ?? 0} Comment{(comments[feedback.id]?.length ?? feedback.commentCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                  {expandedComments.has(feedback.id) ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {expandedComments.has(feedback.id) && (
                  <div className="space-y-3">
                    {/* Comment Form */}
                    <FeedbackCommentForm
                      feedbackId={feedback.id}
                      onCommentAdded={() => loadComments(feedback.id)}
                    />

                    {/* Comments List */}
                    {loadingComments.has(feedback.id) ? (
                      <FeedbackCommentSkeleton />
                    ) : (
                      <FeedbackCommentList
                        comments={comments[feedback.id] || []}
                        onCommentUpdated={() => loadComments(feedback.id)}
                        highlightCommentId={highlightCommentId}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              // Show ellipsis
              const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
              const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

              if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                return null;
              }

              if (showEllipsisBefore || showEllipsisAfter) {
                return (
                  <span
                    key={`ellipsis-${page}`}
                    className="px-2 text-slate-400 dark:text-slate-600"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-medium text-sm transition-colors ${currentPage === page
                    ? "bg-green-600 text-white"
                    : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      )}

      {/* Media Viewer Modal */}
      {allMedia.length > 0 && (
        <MediaViewer
          media={allMedia.map(m => ({ type: m.type, url: m.url }))}
          initialIndex={viewingMediaIndex || 0}
          open={viewingMediaIndex !== null}
          onClose={() => setViewingMediaIndex(null)}
        />
      )}

      {/* Voters Modal */}
      <FeedbackVotersModal
        feedbackId={votersModalFeedbackId}
        isOpen={votersModalFeedbackId !== null}
        onClose={() => setVotersModalFeedbackId(null)}
      />
    </>
  );
}
