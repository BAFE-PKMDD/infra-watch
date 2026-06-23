"use client";

import { Star, User, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FeedbackCommentForm } from "./feedback-comment-form";
import { FeedbackCommentList } from "./feedback-comment-list";
import { useAuth } from "@/providers/auth-provider";

interface FeedbackItem {
  id: string;
  rating?: number | null;
  comment: string;
  category: string;
  isAnonymous: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  comments: any[];
}

interface FeedbackListProps {
  feedbacks: FeedbackItem[];
  onEdit?: (feedback: any) => void;
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
  progress: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  concerns: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
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
  feedbacks: initialFeedbacks,
  onEdit,
  onDelete,
  highlightFeedbackId,
  highlightCommentId,
}: FeedbackListProps) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  
  const [feedbacksList, setFeedbacksList] = useState<FeedbackItem[]>(initialFeedbacks);
  const [currentPage, setCurrentPage] = useState(1);
  const [userVotes, setUserVotes] = useState<Record<string, "helpful" | "unhelpful">>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { helpfulCount: number; unhelpfulCount: number }>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const itemsPerPage = 5;

  const handleVote = (feedbackId: string, voteType: "helpful" | "unhelpful") => {
    const currentVote = userVotes[feedbackId];
    const counts = voteCounts[feedbackId] || {
      helpfulCount: feedbacksList.find(f => f.id === feedbackId)?.helpfulCount || 0,
      unhelpfulCount: feedbacksList.find(f => f.id === feedbackId)?.unhelpfulCount || 0
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
      [feedbackId]: { helpfulCount: newHelpful, unhelpfulCount: newUnhelpful }
    }));

    setUserVotes(prev => {
      const updated = { ...prev };
      if (newVote) updated[feedbackId] = newVote;
      else delete updated[feedbackId];
      return updated;
    });
  };

  const toggleComments = (feedbackId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId);
      } else {
        newSet.add(feedbackId);
      }
      return newSet;
    });
  };

  const handleCommentAdded = (feedbackId: string, commentText: string, mediaFiles: any[]) => {
    setFeedbacksList(prev => prev.map(f => {
      if (f.id !== feedbackId) return f;
      
      const newComment = {
        id: `c-mock-${Date.now()}`,
        feedbackId,
        userId: currentUserId || "anonymous",
        comment: commentText,
        createdAt: new Date().toISOString(),
        media: mediaFiles,
        helpfulCount: 0,
        unhelpfulCount: 0,
        user: {
          id: currentUserId || "anonymous",
          name: user?.name || "Anonymous Citizen",
          image: null
        }
      };

      return {
        ...f,
        comments: [...f.comments, newComment]
      };
    }));
  };

  const handleCommentDeleted = (feedbackId: string, commentId: string) => {
    setFeedbacksList(prev => prev.map(f => {
      if (f.id !== feedbackId) return f;
      return {
        ...f,
        comments: f.comments.filter(c => c.id !== commentId)
      };
    }));
  };

  const handleCommentEdit = (feedbackId: string, commentId: string, newText: string) => {
    setFeedbacksList(prev => prev.map(f => {
      if (f.id !== feedbackId) return f;
      return {
        ...f,
        comments: f.comments.map(c => {
          if (c.id !== commentId) return c;
          return { ...c, comment: newText };
        })
      };
    }));
  };

  const totalPages = Math.ceil(feedbacksList.length / itemsPerPage);
  const paginatedFeedbacks = feedbacksList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {paginatedFeedbacks.map((feedback) => {
        const counts = voteCounts[feedback.id] || {
          helpfulCount: feedback.helpfulCount,
          unhelpfulCount: feedback.unhelpfulCount
        };
        const userVote = userVotes[feedback.id];
        const isExpanded = expandedComments.has(feedback.id);
        const displayName = feedback.isAnonymous ? "Anonymous Citizen" : (feedback.user?.name || "Citizen");
        const initials = getInitials(displayName);
        const isHighlighted = highlightFeedbackId === feedback.id;

        return (
          <div
            key={feedback.id}
            className={`p-6 rounded-lg border transition-all ${
              isHighlighted
                ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
            {/* Header info */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                  {feedback.user?.image && !feedback.isAnonymous ? (
                    <Image
                      src={feedback.user.image}
                      alt={displayName}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold">{displayName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[feedback.category] || categoryColors.general}`}>
                      {categoryLabels[feedback.category] || "General"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Star rating display */}
              {feedback.rating && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        feedback.rating! >= star ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-slate-300 dark:stroke-slate-700"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Content text */}
            <p className="text-sm leading-relaxed mb-4 text-slate-700 dark:text-slate-300 font-medium">
              {feedback.comment}
            </p>

            {/* Footer actions */}
            <div className="flex items-center gap-6 text-xs font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-3">
              <button
                onClick={() => handleVote(feedback.id, "helpful")}
                className={`flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer ${
                  userVote === "helpful" ? "text-emerald-600 dark:text-emerald-400" : ""
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful ({counts.helpfulCount})</span>
              </button>

              <button
                onClick={() => handleVote(feedback.id, "unhelpful")}
                className={`flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer ${
                  userVote === "unhelpful" ? "text-rose-600 dark:text-rose-400" : ""
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Unhelpful ({counts.unhelpfulCount})</span>
              </button>

              <button
                onClick={() => toggleComments(feedback.id)}
                className={`flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer ${
                  isExpanded ? "text-emerald-600 dark:text-emerald-400" : ""
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments ({feedback.comments.length})</span>
              </button>

              {feedback.user?.id === currentUserId && (
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors bg-transparent border-0 cursor-pointer">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <DropdownMenuItem onClick={() => onEdit?.(feedback)} className="flex items-center gap-1.5 focus:bg-slate-100 dark:focus:bg-slate-800 py-1.5 cursor-pointer">
                        <Pencil className="w-3 h-3" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete?.(feedback.id)} className="flex items-center gap-1.5 text-rose-600 focus:bg-slate-100 dark:focus:bg-slate-800 py-1.5 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Expanded comments section */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60"
                >
                  <div className="space-y-4">
                    <FeedbackCommentList
                      comments={feedback.comments}
                      onCommentUpdated={() => {}}
                      onCommentDeleted={(commentId) => handleCommentDeleted(feedback.id, commentId)}
                      onCommentEdit={(commentId, newText) => handleCommentEdit(feedback.id, commentId, newText)}
                      highlightCommentId={highlightCommentId}
                    />
                    <FeedbackCommentForm
                      feedbackId={feedback.id}
                      onCommentAdded={(text, media) => handleCommentAdded(feedback.id, text, media)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {feedbacksList.length === 0 && (
        <div className="bg-slate-50 dark:bg-slate-950 p-12 text-center border border-slate-200 dark:border-slate-850 rounded-lg text-slate-400 italic">
          No feedback has been shared for this project yet.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-500 font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
