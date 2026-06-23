"use client";

import { useState } from "react";
import { LogIn, MessageSquarePlus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { FeedbackSubmissionForm } from "./feedback-submission-form";
import { FeedbackList } from "./feedback-list";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProjectFeedbackProps {
  projectId: string;
  highlightFeedbackId?: string;
  highlightCommentId?: string;
}

const MOCK_FEEDBACKS = [
  {
    id: "fb-1",
    rating: 5,
    comment: "The solar water pump is operating efficiently. It has drastically reduced the cost of watering our rice fields.",
    createdAt: new Date("2026-05-10T10:00:00Z").toISOString(),
    status: "approved",
    user: {
      name: "Juan Dela Cruz",
      role: "citizen"
    },
    comments: [
      {
        id: "c-1",
        comment: "Agree! The cooperative is very happy with this project.",
        createdAt: new Date("2026-05-11T12:00:00Z").toISOString(),
        user: {
          name: "Maria Santos",
          role: "citizen"
        }
      }
    ],
    upvotes: 12,
    downvotes: 0,
    userVote: null
  },
  {
    id: "fb-2",
    rating: 4,
    comment: "Construction of the distribution canal was finished on time. Minor debris left behind, but otherwise functional.",
    createdAt: new Date("2026-06-01T14:30:00Z").toISOString(),
    status: "approved",
    user: {
      name: "Pedro Penduko",
      role: "citizen"
    },
    comments: [],
    upvotes: 5,
    downvotes: 1,
    userVote: null
  }
];

export function ProjectFeedback({
  projectId,
  highlightFeedbackId,
  highlightCommentId,
}: ProjectFeedbackProps) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: isCheckingAuth } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>(MOCK_FEEDBACKS);
  const [editingFeedback, setEditingFeedback] = useState<any>(null);

  const handleFeedbackSuccess = () => {
    setIsModalOpen(false);
    setEditingFeedback(null);
  };

  const handleEdit = (feedback: any) => {
    setEditingFeedback(feedback);
    setIsModalOpen(true);
  };

  const handleDelete = (feedbackId: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500 dark:text-slate-400">{t("projects.stats.loading")}</div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with solid emerald background (no gradients) */}
      <div className="bg-emerald-600 px-6 py-4 rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">{t("projectDetail.feedback.title")}</h2>
          {isAuthenticated ? (
            <Dialog open={isModalOpen} onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) setEditingFeedback(null);
            }}>
              <DialogTrigger
                render={
                  <Button
                    variant="secondary"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    {t("projectDetail.feedback.share")}
                  </Button>
                }
              />
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <DialogHeader>
                  <DialogTitle>{editingFeedback ? t("projectDetail.feedback.edit") : t("projectDetail.feedback.share")}</DialogTitle>
                  <DialogDescription>
                    {editingFeedback
                      ? t("projectDetail.feedback.editDesc")
                      : t("projectDetail.feedback.shareDesc")}
                  </DialogDescription>
                </DialogHeader>
                <FeedbackSubmissionForm
                  projectId={projectId}
                  onSuccess={handleFeedbackSuccess}
                  editMode={!!editingFeedback}
                  initialData={editingFeedback}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Link
              href={`/sign-in`}
            >
              <Button className="bg-white hover:bg-white/90 text-emerald-600 font-semibold">
                <LogIn className="w-4 h-4 mr-2" />
                {t("projectDetail.feedback.signIn")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <FeedbackList
          feedbacks={feedbacks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          highlightFeedbackId={highlightFeedbackId}
          highlightCommentId={highlightCommentId}
        />
      </div>
    </motion.div>
  );
}
