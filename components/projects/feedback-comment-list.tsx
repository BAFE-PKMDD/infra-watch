"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Play,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { MediaViewer } from "@/components/ui/media-viewer";
import Image from "next/image";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import {
  voteComment,
  updateFeedbackComment,
  deleteFeedbackComment,
} from "@/actions/mutation/feedback-comment.mutation";
import { getUserCommentVotes } from "@/actions/query/feedback-comments.query";
import { CommentVotersModal } from "./comment-voters-modal";
import { FeedbackCommentForm } from "./feedback-comment-form";
import { useAuth } from "@/providers/auth-provider";
import { getAnonymousUser } from "@/lib/anonymous-identifier";
import { AnonymousIcon } from "@/components/shared/anonymous-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CommentMedia } from "@/types/feedback.types";

interface Comment {
  id: string;
  feedbackId: string;
  userId: string;
  comment: string;
  media?: CommentMedia[];
  helpfulCount: number;
  unhelpfulCount: number;
  createdAt: Date | string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface FeedbackCommentListProps {
  comments: Comment[];
  onCommentUpdated?: () => void;
  highlightCommentId?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatFbTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 52) return `${diffInWeeks}w`;
  return `${Math.floor(diffInWeeks / 52)}y`;
}

function renderCommentBody(text: string) {
  // Matches @Word or @Name #1234 or @Anonymous #1234
  const parts = text.split(/(@[A-Za-z0-9_]+(?:\s#[0-9]{4})?)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={i}
          className="font-semibold text-[#1877F2] dark:text-[#2d88ff] hover:underline cursor-pointer"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function FeedbackCommentList({
  comments,
  onCommentUpdated,
  highlightCommentId,
}: FeedbackCommentListProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [votingComment, setVotingComment] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<
    Record<string, { helpfulCount: number; unhelpfulCount: number }>
  >({});
  const [userVotes, setUserVotes] = useState<Record<string, "helpful" | "unhelpful">>({});
  const [votersModalCommentId, setVotersModalCommentId] = useState<string | null>(null);
  const [viewingMediaIndex, setViewingMediaIndex] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sort comments by createdAt based on sortOrder
  const sortedComments = useMemo(
    () =>
      [...comments].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }),
    [comments, sortOrder]
  );

  // Fetch user votes when comments change
  useEffect(() => {
    if (comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      getUserCommentVotes(commentIds)
        .then((result) => {
          if (result.success) {
            setUserVotes(result.data);
          }
        })
        .catch((error) => {
          console.error("Error fetching user comment votes:", error);
        });
    }
  }, [comments]);

  // Handle voting
  const handleVote = async (commentId: string, voteType: "helpful" | "unhelpful") => {
    setVotingComment(commentId);

    try {
      const result = await voteComment({ commentId, voteType });

      // Update local vote counts
      setVoteCounts((prev) => ({
        ...prev,
        [commentId]: {
          helpfulCount: result.data.helpfulCount,
          unhelpfulCount: result.data.unhelpfulCount,
        },
      }));

      // Update user's vote state
      if (result.data.userVote) {
        setUserVotes((prev) => ({
          ...prev,
          [commentId]: result.data.userVote as "helpful" | "unhelpful",
        }));
      } else {
        // Vote was removed
        setUserVotes((prev) => {
          const newVotes = { ...prev };
          delete newVotes[commentId];
          return newVotes;
        });
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVotingComment(null);
    }
  };

  // Start editing a comment
  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.comment);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  // Update comment
  const handleUpdate = async (commentId: string) => {
    if (!editText.trim()) return;

    setIsUpdating(true);
    try {
      const result = await updateFeedbackComment({
        commentId,
        comment: editText,
      });

      if (!result.success) {
        toast.error("Comment blocked", {
          description: result.message,
          duration: 6500,
        });
        return;
      }

      setEditingCommentId(null);
      setEditText("");
      onCommentUpdated?.();
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete comment
  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteFeedbackComment(commentToDelete);
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
      onCommentUpdated?.();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get all media from comments for navigation
  const allMedia = sortedComments
    .flatMap((comment) =>
      (comment.media || []).map((item) => {
        const url = getFullUrl(item.url);
        return url
          ? {
              ...item,
              commentId: comment.id,
              url,
            }
          : null;
      })
    )
    .filter(
      (
        item
      ): item is {
        type: "image" | "video";
        url: string;
        caption?: string;
        commentId: string;
      } => item !== null
    );

  // Handle scrolling to highlighted comment
  useEffect(() => {
    if (highlightCommentId) {
      const timer = setTimeout(() => {
        const element = commentRefs.current[highlightCommentId];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [highlightCommentId, comments]);

  if (comments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No comments yet. Be the first to share your thoughts!
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Sort order toggle */}
      {comments.length > 1 && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="h-6 px-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            {sortOrder === "asc" ? (
              <>
                <ArrowUp className="w-3 h-3 mr-1 text-slate-400" />
                Oldest First
              </>
            ) : (
              <>
                <ArrowDown className="w-3 h-3 mr-1 text-slate-400" />
                Newest First
              </>
            )}
          </Button>
        </div>
      )}

      {/* Facebook-style comments list */}
      <div className="space-y-3.5">
        {sortedComments.map((comment) => {
          const isOwnComment = currentUserId && comment.userId === currentUserId;
          const isEditing = editingCommentId === comment.id;

          // Determine anonymous representation
          const isAnonymous =
            !comment.user.name ||
            comment.user.name === "Citizen" ||
            comment.user.name === "Anonymous";
          const anon = isAnonymous ? getAnonymousUser(comment.userId || comment.id) : null;
          const authorName = anon ? anon.shortName : comment.user.name || "Citizen";

          // Calculate helpful count
          const helpfulTotal =
            voteCounts[comment.id]?.helpfulCount ?? comment.helpfulCount;
          const userLiked = userVotes[comment.id] === "helpful";

          return (
            <div
              key={comment.id}
              ref={(el) => {
                commentRefs.current[comment.id] = el;
              }}
              className={`transition-all rounded-xl p-1.5 ${
                highlightCommentId === comment.id
                  ? "bg-blue-50/80 dark:bg-blue-950/30 ring-1 ring-[#1877F2]"
                  : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Commenter Avatar */}
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold shadow-2xs ${
                    anon
                      ? `${anon.gradient} ring-2 ${anon.ringColor}`
                      : "bg-gradient-to-br from-blue-600 to-indigo-700"
                  }`}
                >
                  {comment.user.image && getFullUrl(comment.user.image) ? (
                    <Image
                      src={getFullUrl(comment.user.image)!}
                      alt={authorName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover rounded-full"
                      unoptimized={isLocalMinIO(getFullUrl(comment.user.image)!)}
                    />
                  ) : anon ? (
                    <AnonymousIcon
                      name={anon.iconName}
                      className="w-4 h-4 text-white drop-shadow-xs"
                    />
                  ) : (
                    <span>{getInitials(authorName)}</span>
                  )}
                </div>

                {/* Comment Content Column */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="bg-[#f0f2f5] dark:bg-[#242526] rounded-[18px] p-3 space-y-2 border border-slate-200 dark:border-slate-700">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                        rows={2}
                        disabled={isUpdating}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUpdate(comment.id)}
                          disabled={isUpdating || !editText.trim()}
                          className="h-6 px-3 text-[11px] bg-[#1877F2] hover:bg-[#166fe5] text-white"
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          variant="ghost"
                          className="h-6 px-2 text-[11px] text-slate-600 dark:text-slate-400"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display: Facebook Speech Bubble */
                    <div className="inline-flex items-start gap-1 max-w-full">
                      <div className="inline-block bg-[#f0f2f5] dark:bg-[#242526] hover:bg-[#eaecee] dark:hover:bg-[#2a2b2c] transition-colors rounded-[18px] px-3.5 py-2 max-w-[95%] relative shadow-2xs group">
                        {/* Author Header */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-[13px] text-slate-900 dark:text-[#e4e6eb] hover:underline cursor-pointer">
                            {authorName}
                          </span>
                          {anon && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200/90 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                              #{anon.number}
                            </span>
                          )}
                        </div>

                        {/* Comment Text with Mention Highlighting */}
                        <p className="text-[13px] text-slate-800 dark:text-[#e4e6eb] leading-snug break-words whitespace-pre-line select-text">
                          {renderCommentBody(comment.comment)}
                        </p>

                        {/* Facebook Floating Reaction Pill */}
                        {helpfulTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => setVotersModalCommentId(comment.id)}
                            className="absolute -bottom-2 right-2 bg-white dark:bg-[#242526] border border-slate-200/90 dark:border-slate-700 shadow-xs rounded-full px-1.5 py-0.5 flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                            title={`${helpfulTotal} people found this helpful`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                              <ThumbsUp className="w-2 h-2 fill-current" />
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {helpfulTotal}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* 3-dots Dropdown Menu (for owner) */}
                      {isOwnComment && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                                aria-label="Comment options"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            }
                          />
                          <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem
                              onClick={() => handleEdit(comment)}
                              className="cursor-pointer text-xs"
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(comment.id)}
                              className="cursor-pointer text-red-600 dark:text-red-400 text-xs"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}

                  {/* Media Attachments Gallery */}
                  {comment.media && comment.media.length > 0 && !isEditing && (
                    <div className="mt-2 pl-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-w-sm">
                        {comment.media.map((item, index) => {
                          const mediaUrl = getFullUrl(item.url);

                          return (
                            <motion.div
                              key={index}
                              className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-2xs active:scale-95 transition-transform"
                              whileHover={{ scale: 1.02 }}
                              onClick={() => {
                                const mediaIndex = allMedia.findIndex(
                                  (m) =>
                                    m.url === getFullUrl(item.url) &&
                                    m.commentId === comment.id
                                );
                                if (mediaIndex !== -1) setViewingMediaIndex(mediaIndex);
                              }}
                            >
                              {item.type === "image" && mediaUrl ? (
                                <Image
                                  src={mediaUrl}
                                  alt={item.caption || `Attachment ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="120px"
                                  unoptimized={isLocalMinIO(mediaUrl)}
                                />
                              ) : item.type === "video" && mediaUrl ? (
                                <div className="relative w-full h-full">
                                  <video
                                    src={`${mediaUrl}#t=0.1`}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    preload="metadata"
                                    muted
                                    playsInline
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-7 h-7 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                                      <Play
                                        className="w-3.5 h-3.5 text-slate-900 ml-0.5"
                                        fill="currentColor"
                                      />
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

                  {/* Sub-action Row: Like · Reply · Timestamp */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 pl-3.5 pt-1 text-[12px] font-semibold text-slate-500 dark:text-[#b0b3b8]">
                      {/* Like Action */}
                      <button
                        type="button"
                        onClick={() => handleVote(comment.id, "helpful")}
                        disabled={votingComment === comment.id}
                        className={`py-1.5 px-1.5 -my-1 -mx-0.5 rounded hover:underline cursor-pointer transition-colors inline-flex items-center ${
                          userLiked
                            ? "text-[#1877F2] dark:text-[#2d88ff] font-bold"
                            : "hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        Like
                      </button>

                      {/* Reply Action */}
                      <button
                        type="button"
                        onClick={() =>
                          setReplyingToId((prev) => (prev === comment.id ? null : comment.id))
                        }
                        className="py-1.5 px-1.5 -my-1 -mx-0.5 rounded hover:underline cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center"
                      >
                        Reply
                      </button>

                      {/* Optional discreet unhelpful toggle */}
                      <button
                        type="button"
                        onClick={() => handleVote(comment.id, "unhelpful")}
                        disabled={votingComment === comment.id}
                        className={`p-1.5 -m-1 rounded hover:underline cursor-pointer transition-colors inline-flex items-center ${
                          userVotes[comment.id] === "unhelpful"
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-slate-400 dark:text-slate-400 hover:text-rose-600"
                        }`}
                        title="Mark as unhelpful"
                      >
                        <ThumbsDown
                          className={`w-3 h-3 ${
                            userVotes[comment.id] === "unhelpful" ? "fill-current" : ""
                          }`}
                        />
                      </button>

                      {/* Relative Timestamp */}
                      <span
                        className="text-[11px] font-normal text-slate-500 dark:text-slate-400 ml-1"
                        title={format(
                          new Date(comment.createdAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      >
                        {formatFbTime(comment.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Inline Threaded Facebook Reply Form */}
                  {replyingToId === comment.id && (
                    <div className="mt-2.5 ml-4 sm:ml-6 relative">
                      {/* Facebook Curved Branch Line */}
                      <div className="absolute -left-4 sm:-left-5 top-0 w-4 h-5 border-l-2 border-b-2 border-slate-300 dark:border-slate-700 rounded-bl-xl pointer-events-none" />
                      <FeedbackCommentForm
                        feedbackId={comment.feedbackId}
                        replyToName={authorName}
                        isReply={true}
                        autoFocus={true}
                        onCancelReply={() => setReplyingToId(null)}
                        onCommentAdded={() => {
                          setReplyingToId(null);
                          onCommentUpdated?.();
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Media Viewer Modal */}
      {allMedia.length > 0 && (
        <MediaViewer
          media={allMedia.map((m) => ({ type: m.type, url: m.url }))}
          initialIndex={viewingMediaIndex || 0}
          open={viewingMediaIndex !== null}
          onClose={() => setViewingMediaIndex(null)}
        />
      )}

      {/* Voters Modal */}
      <CommentVotersModal
        commentId={votersModalCommentId}
        isOpen={votersModalCommentId !== null}
        onClose={() => setVotersModalCommentId(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
