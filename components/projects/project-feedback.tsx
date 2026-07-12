"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn, MessageSquarePlus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { FeedbackSubmissionForm } from "./feedback-submission-form";
import { FeedbackList } from "./feedback-list";
import { FeedbackSkeleton } from "./feedback-skeleton";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { useNotifications } from "@/providers/notification-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface ProjectFeedbackProps {
  projectId: string;
  highlightFeedbackId?: string;
  highlightCommentId?: string;
}

export function ProjectFeedback({
  projectId,
  highlightFeedbackId,
  highlightCommentId,
}: ProjectFeedbackProps) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: isCheckingAuth } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<any>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { notifications } = useNotifications();
  const lastNotificationIdRef = useRef<string | null>(null);

  // Fetch feedback for this project
  const {
    data: feedbackData,
    isLoading: isLoadingFeedback,
    refetch,
  } = useQuery({
    queryKey: ["project-feedback", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/feedback`);
      if (!response.ok) throw new Error("Failed to fetch feedback");
      return response.json();
    },
  });

  // Listen for feedback approval notifications to auto-refresh the list
  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];
    if (!latestNotification) return;

    if (latestNotification.id === lastNotificationIdRef.current) return;

    const metadata = latestNotification.metadata as { projectId?: string } | null;
    const isRelevantFeedbackEvent =
      latestNotification.type === "feedback_approved" ||
      latestNotification.type === "feedback_rejected" ||
      (latestNotification.type === "feedback_submitted" && metadata?.projectId === projectId);

    if (isRelevantFeedbackEvent) {
      // Invalidate and refetch to show the new approved feedback
      queryClient.invalidateQueries({ queryKey: ["project-feedback", projectId] });
      lastNotificationIdRef.current = latestNotification.id;
    }
  }, [notifications, queryClient, projectId]);

  const feedbacks = feedbackData?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const response = await fetch(`/api/projects/${projectId}/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete feedback");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-feedback", projectId] });
      setDeletingFeedbackId(null);
    },
  });

  const handleFeedbackSuccess = () => {
    setIsModalOpen(false);
    setEditingFeedback(null);
    refetch();
  };

  const handleEdit = (feedback: any) => {
    setEditingFeedback(feedback);
    setIsModalOpen(true);
  };

  const handleDelete = (feedbackId: string) => {
    setDeletingFeedbackId(feedbackId);
  };

  const confirmDelete = () => {
    if (deletingFeedbackId) {
      deleteMutation.mutate(deletingFeedbackId);
    }
  };

  // Show loading state while checking auth
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
      {/* Header with green background */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-lg">
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
                  />
                }
              >
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                {t("projectDetail.feedback.share")}
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              href={`/sign-in?redirect=${encodeURIComponent(
                typeof window !== "undefined"
                  ? window.location.pathname +
                  window.location.search +
                  window.location.hash
                  : ""
              )}`}
            >
              <Button className="bg-white hover:bg-white/90 text-green-600 font-semibold">
                <LogIn className="w-4 h-4 mr-2" />
                {t("projectDetail.feedback.signIn")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoadingFeedback ? (
          <FeedbackSkeleton />
        ) : (
          <FeedbackList
            feedbacks={feedbacks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            highlightFeedbackId={highlightFeedbackId}
            highlightCommentId={highlightCommentId}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFeedbackId} onOpenChange={(open) => !open && setDeletingFeedbackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projectDetail.feedback.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("projectDetail.feedback.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("projectDetail.feedback.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? t("projectDetail.feedback.deleting") : t("projectDetail.feedback.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
