"use client";

import { useEffect, useState } from "react";
import { X, User, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { getFeedbackVoters } from "@/actions/query/feedback-votes.query";
import { getFullUrl } from "@/lib/minio-url";

interface Voter {
  userId: string;
  name: string | null;
  image: string | null;
  votedAt: Date;
}

interface FeedbackVotersModalProps {
  feedbackId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackVotersModal({ feedbackId, isOpen, onClose }: FeedbackVotersModalProps) {
  const [loading, setLoading] = useState(false);
  const [helpfulVoters, setHelpfulVoters] = useState<Voter[]>([]);
  const [unhelpfulVoters, setUnhelpfulVoters] = useState<Voter[]>([]);
  const [activeTab, setActiveTab] = useState<"helpful" | "unhelpful">("helpful");

  useEffect(() => {
    if (isOpen && feedbackId) {
      setLoading(true);
      getFeedbackVoters(feedbackId)
        .then((result) => {
          if (result.success) {
            setHelpfulVoters(result.data.helpfulVoters);
            setUnhelpfulVoters(result.data.unhelpfulVoters);
            // Set active tab to the one with more voters
            if (result.data.unhelpfulVoters.length > result.data.helpfulVoters.length) {
              setActiveTab("unhelpful");
            } else {
              setActiveTab("helpful");
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching voters:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [feedbackId, isOpen]);

  if (!isOpen || !feedbackId) return null;

  const currentVoters = activeTab === "helpful" ? helpfulVoters : unhelpfulVoters;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[80vh] flex flex-col"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Voters
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab("helpful")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "helpful"
                    ? "text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful ({helpfulVoters.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("unhelpful")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === "unhelpful"
                    ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Unhelpful ({unhelpfulVoters.length})</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin"></div>
                </div>
              ) : currentVoters.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    {activeTab === "helpful" ? (
                      <ThumbsUp className="w-6 h-6 text-slate-400" />
                    ) : (
                      <ThumbsDown className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No {activeTab} votes yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentVoters.map((voter) => (
                    <div
                      key={voter.userId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {voter.image && getFullUrl(voter.image) ? (
                          <Image
                            src={getFullUrl(voter.image)!}
                            alt={voter.name || "User"}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {voter.name || "Anonymous User"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
