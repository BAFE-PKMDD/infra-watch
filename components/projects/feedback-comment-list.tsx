"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ThumbsUp, ThumbsDown, Play, X, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { MediaViewer } from "@/components/ui/media-viewer";
import Image from "next/image";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { voteComment, updateFeedbackComment, deleteFeedbackComment } from "@/actions/mutation/feedback-comment.mutation";
import { getUserCommentVotes } from "@/actions/query/feedback-comments.query";
import { CommentVotersModal } from "./comment-voters-modal";
import { useAuth } from "@/providers/auth-provider";
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
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FeedbackCommentList({
  comments,
  onCommentUpdated,
  highlightCommentId,
}: FeedbackCommentListProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [votingComment, setVotingComment] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<Record<string, { helpfulCount: number; unhelpfulCount: number }>>({});
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
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});


  // Sort comments by createdAt based on sortOrder
  const sortedComments = useMemo(() =>
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
      const commentIds = comments.map(c => c.id);
      getUserCommentVotes(commentIds).then((result) => {
        if (result.success) {
          setUserVotes(result.data);
        }
      }).catch((error) => {
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
      setVoteCounts(prev => ({
        ...prev,
        [commentId]: {
          helpfulCount: result.data.helpfulCount,
          unhelpfulCount: result.data.unhelpfulCount,
        },
      }));

      // Update user's vote state
      if (result.data.userVote) {
        setUserVotes(prev => ({
          ...prev,
          [commentId]: result.data.userVote as "helpful" | "unhelpful",
        }));
      } else {
        // Vote was removed
        setUserVotes(prev => {
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
      alert("Failed to update comment. Please try again.");
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
      alert("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get all media from comments for navigation
  const allMedia = sortedComments.flatMap(comment =>
    (comment.media || []).map(item => {
      const url = getFullUrl(item.url);
      return url ? {
        ...item,
        commentId: comment.id,
        url
      } : null;
    })
  ).filter((item): item is { type: 'image' | 'video'; url: string; caption?: string; commentId: string } => item !== null);

  // KB navigation is now handled by MediaViewer

  // Handle scrolling to highlighted comment
  useEffect(() => {
    if (highlightCommentId) {
      setTimeout(() => {
        const element = commentRefs.current[highlightCommentId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 800);
    }
  }, [highlightCommentId, comments]);

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No comments yet. Be the first to comment!
        </p>
      </div>
    );
  }

  return (
    <>
      {comments.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="h-6 px-2 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          >
            {sortOrder === "asc" ? (
              <>
                <ArrowUp className="w-3 h-3 mr-1" />
                Oldest First
              </>
            ) : (
              <>
                <ArrowDown className="w-3 h-3 mr-1" />
                Newest First
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {sortedComments.map((comment) => {
          const isOwnComment = currentUserId && comment.userId === currentUserId;
          const isEditing = editingCommentId === comment.id;

          return (
            <div
              key={comment.id}
              ref={el => { commentRefs.current[comment.id] = el; }}
              className={`rounded-lg border p-3 transition-colors ${highlightCommentId === comment.id
                ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                }`}
            >
              {/* Header */}
              <div className="flex items-start gap-2 mb-2">
                {/* User Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {comment.user.image && getFullUrl(comment.user.image) ? (
                    <Image
                      src={getFullUrl(comment.user.image)!}
                      alt={comment.user.name || "User"}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-[10px] font-semibold">
                      {getInitials(comment.user.name || "User")}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-slate-900 dark:text-white">
                        {comment.user.name || "Anonymous"}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>

                    {/* Edit/Delete Menu - Only show for own comments */}
                    {isOwnComment && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                          >
                            <MoreVertical className="h-3 w-3" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(comment)}
                            className="cursor-pointer text-xs"
                          >
                            <Pencil className="mr-2 h-3 w-3" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(comment.id)}
                            className="cursor-pointer text-red-600 dark:text-red-400 text-xs"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Comment Text or Edit Mode */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        disabled={isUpdating}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUpdate(comment.id)}
                          disabled={isUpdating || !editText.trim()}
                          className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700"
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {comment.comment}
                    </p>
                  )}

                  {/* Media Attachments - Always visible */}
                  {comment.media && comment.media.length > 0 && (
                    <div className="mt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {comment.media.map((item, index) => {
                          const mediaUrl = getFullUrl(item.url);
                          const globalIndex = allMedia.findIndex(m => m.url === mediaUrl && m.commentId === comment.id);

                          return (
                            <motion.div
                              key={index}
                              className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-sm active:scale-95 transition-transform"
                              whileHover={{ scale: 1.02 }}
                              onClick={() => {
                                const mediaIndex = allMedia.findIndex(m => m.url === getFullUrl(item.url) && m.commentId === comment.id);
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
                                    <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                                      <Play className="w-4 h-4 text-slate-900 ml-0.5" fill="currentColor" />
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

                  {/* Voting */}
                  <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleVote(comment.id, "helpful")}
                        disabled={votingComment === comment.id}
                        className={`p-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${userVotes[comment.id] === "helpful"
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                          }`}
                        aria-label="Mark as helpful"
                      >
                        <ThumbsUp
                          className={`w-2.5 h-2.5 ${userVotes[comment.id] === "helpful" ? "fill-current" : ""
                            }`}
                        />
                      </button>
                      <button
                        onClick={() => setVotersModalCommentId(comment.id)}
                        className="text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:underline transition-colors cursor-pointer"
                      >
                        {voteCounts[comment.id]?.helpfulCount ?? comment.helpfulCount}
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleVote(comment.id, "unhelpful")}
                        disabled={votingComment === comment.id}
                        className={`p-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${userVotes[comment.id] === "unhelpful"
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                          }`}
                        aria-label="Mark as unhelpful"
                      >
                        <ThumbsDown
                          className={`w-2.5 h-2.5 ${userVotes[comment.id] === "unhelpful" ? "fill-current" : ""
                            }`}
                        />
                      </button>
                      <button
                        onClick={() => setVotersModalCommentId(comment.id)}
                        className="text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors cursor-pointer"
                      >
                        {voteCounts[comment.id]?.unhelpfulCount ?? comment.unhelpfulCount}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
