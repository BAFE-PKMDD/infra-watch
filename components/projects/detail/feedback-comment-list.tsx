"use client";

import { useState, useMemo } from "react";
import { ThumbsUp, ThumbsDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Comment {
  id: string;
  feedbackId: string;
  userId: string;
  comment: string;
  media?: Array<{ type: 'image' | 'video'; url: string }>;
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
  onCommentDeleted?: (commentId: string) => void;
  onCommentEdit?: (commentId: string, newText: string) => void;
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
  onCommentDeleted,
  onCommentEdit,
  highlightCommentId,
}: FeedbackCommentListProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [voteCounts, setVoteCounts] = useState<Record<string, { helpfulCount: number; unhelpfulCount: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<string, "helpful" | "unhelpful">>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const sortedComments = useMemo(() =>
    [...comments].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }),
    [comments, sortOrder]
  );

  const handleVote = (commentId: string, voteType: "helpful" | "unhelpful") => {
    const currentVote = userVotes[commentId];
    const counts = voteCounts[commentId] || {
      helpfulCount: comments.find(c => c.id === commentId)?.helpfulCount || 0,
      unhelpfulCount: comments.find(c => c.id === commentId)?.unhelpfulCount || 0
    };

    let newHelpful = counts.helpfulCount;
    let newUnhelpful = counts.unhelpfulCount;
    let newVote: "helpful" | "unhelpful" | null = voteType;

    if (currentVote === voteType) {
      if (voteType === "helpful") newHelpful--;
      else newUnhelpful--;
      newVote = null;
    } else {
      if (currentVote === "helpful") newHelpful--;
      if (currentVote === "unhelpful") newUnhelpful--;
      
      if (voteType === "helpful") newHelpful++;
      else newUnhelpful++;
    }

    setVoteCounts(prev => ({
      ...prev,
      [commentId]: { helpfulCount: newHelpful, unhelpfulCount: newUnhelpful }
    }));

    setUserVotes(prev => {
      const updated = { ...prev };
      if (newVote) updated[commentId] = newVote;
      else delete updated[commentId];
      return updated;
    });
  };

  const handleEditClick = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.comment);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleUpdate = (commentId: string) => {
    if (!editText.trim()) return;
    onCommentEdit?.(commentId, editText.trim());
    setEditingCommentId(null);
    setEditText("");
    onCommentUpdated?.();
  };

  const handleDeleteClick = (commentId: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onCommentDeleted?.(commentId);
      onCommentUpdated?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Sorting */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase">Comments ({comments.length})</h4>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-400 font-semibold"
        >
          <option value="asc">Oldest First</option>
          <option value="desc">Newest First</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {sortedComments.map((comment) => {
          const isEditing = editingCommentId === comment.id;
          const initials = getInitials(comment.user.name || "Anonymous");
          const counts = voteCounts[comment.id] || {
            helpfulCount: comment.helpfulCount,
            unhelpfulCount: comment.unhelpfulCount
          };
          const userVote = userVotes[comment.id];
          const isHighlighted = highlightCommentId === comment.id;

          return (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border transition-all ${
                isHighlighted 
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* User Info */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                    {comment.user.image ? (
                      <Image
                        src={comment.user.image}
                        alt={comment.user.name || "User"}
                        width={24}
                        height={24}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {comment.user.name || "Anonymous User"}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Options Menu (if owner) */}
                {comment.userId === currentUserId && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors bg-transparent border-0 cursor-pointer">
                          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <DropdownMenuItem onClick={() => handleEditClick(comment)} className="flex items-center gap-1.5 focus:bg-slate-100 dark:focus:bg-slate-800 py-1.5 cursor-pointer">
                        <Pencil className="w-3 h-3" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(comment.id)} className="flex items-center gap-1.5 text-rose-600 focus:bg-slate-100 dark:focus:bg-slate-800 py-1.5 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Edit Mode / Content */}
              {isEditing ? (
                <div className="space-y-2 mt-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <Button onClick={handleCancelEdit} size="xs" variant="outline">Cancel</Button>
                    <Button onClick={() => handleUpdate(comment.id)} size="xs" className="bg-primary hover:bg-primary/90 text-primary-foreground">Save</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words font-medium">
                    {comment.comment}
                  </p>

                  {/* Media Grid */}
                  {comment.media && comment.media.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      {comment.media.map((med, idx) => (
                        <div key={idx} className="relative aspect-video rounded overflow-hidden border border-slate-200 dark:border-slate-800">
                          {med.type === "image" ? (
                            <Image
                              src={med.url}
                              alt="Comment attachment"
                              fill
                              className="object-cover"
                              sizes="100px"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-white">
                              Video
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vote footer */}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100/50 dark:border-slate-800/40 text-[10px] font-bold text-slate-400">
                    <button
                      onClick={() => handleVote(comment.id, "helpful")}
                      className={`flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer ${
                        userVote === "helpful" ? "text-primary" : ""
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" /> {counts.helpfulCount}
                    </button>
                    <button
                      onClick={() => handleVote(comment.id, "unhelpful")}
                      className={`flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer ${
                        userVote === "unhelpful" ? "text-rose-600 dark:text-rose-400" : ""
                      }`}
                    >
                      <ThumbsDown className="w-3 h-3" /> {counts.unhelpfulCount}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400 italic">
            No comments yet. Be the first to reply!
          </div>
        )}
      </div>
    </div>
  );
}
