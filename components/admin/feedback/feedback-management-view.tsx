"use client";

import type { AdminFeedbackItem } from "@/actions/query/feedback.query";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { MediaViewer } from "@/components/ui/media-viewer";
import { Textarea } from "@/components/ui/textarea";
import { getFullUrl } from "@/lib/minio-url";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ImageIcon,
  MessageSquare,
  Search,
  Star,
  ThumbsUp,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FilterStatus = "all" | "pending" | "approved" | "rejected";

type FeedbackStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageRating: number;
};

type FeedbackListResponse = {
  success: boolean;
  data: AdminFeedbackItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type FeedbackStatsResponse = {
  success: boolean;
  data: FeedbackStats;
};

type FeedbackManagementViewProps = {
  initialData: {
    feedbacks: AdminFeedbackItem[];
    stats: FeedbackStats;
    pagination: FeedbackListResponse["pagination"];
  };
};

const ITEMS_PER_PAGE = 10;

const statusFilters: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const categoryLabels: Record<string, string> = {
  quality: "Project Quality",
  progress: "Project Progress",
  concerns: "Concerns",
  general: "General",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";
}

function authorName(feedback: AdminFeedbackItem) {
  return feedback.user?.name || "Unknown User";
}

function projectLabel(feedback: AdminFeedbackItem) {
  return feedback.project?.name || feedback.projectId;
}

function projectHref(feedback: AdminFeedbackItem) {
  return `/projects/${feedback.project?.abemisId || feedback.projectId}?tab=feedback`;
}

export function FeedbackManagementView({ initialData }: FeedbackManagementViewProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [moderationDialog, setModerationDialog] = useState<{
    feedbackId: string;
    action: "approved" | "rejected";
  } | null>(null);
  const [moderationNote, setModerationNote] = useState("");
  const [deleteFeedbackId, setDeleteFeedbackId] = useState<string | null>(null);
  const [viewingMedia, setViewingMedia] = useState<{
    feedback: AdminFeedbackItem;
    index: number;
  } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const shouldUseInitialData = statusFilter === "all" && page === 1 && !debouncedSearch;

  const { data: statsData } = useQuery<FeedbackStatsResponse>({
    queryKey: ["admin-feedback-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/feedback/stats");
      if (!response.ok) throw new Error("Failed to fetch feedback statistics");
      return response.json();
    },
    initialData: { success: true, data: initialData.stats },
  });

  const { data: feedbackData, isLoading } = useQuery<FeedbackListResponse>({
    queryKey: ["admin-feedback", statusFilter, page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });

      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const response = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch feedback");
      return response.json();
    },
    initialData: shouldUseInitialData
      ? {
        success: true,
        data: initialData.feedbacks,
        pagination: initialData.pagination,
      }
      : undefined,
  });

  const stats = statsData?.data ?? initialData.stats;
  const feedbacks = feedbackData?.data ?? [];
  const pagination = feedbackData?.pagination ?? initialData.pagination;
  const selectedFeedback = useMemo(
    () => feedbacks.find((item) => item.id === selectedFeedbackId) ?? null,
    [feedbacks, selectedFeedbackId],
  );

  const invalidateFeedback = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
    queryClient.invalidateQueries({ queryKey: ["admin-feedback-stats"] });
    queryClient.invalidateQueries({ queryKey: ["project-feedback"] });
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
  };

  const moderateMutation = useMutation({
    mutationFn: async (payload: { feedbackId: string; status: "approved" | "rejected"; moderationNote?: string }) => {
      const response = await fetch(`/api/admin/feedback/${payload.feedbackId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: payload.status,
          moderationNote: payload.moderationNote,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to moderate feedback");
      return result as { message?: string };
    },
    onSuccess: (result) => {
      invalidateFeedback();
      setModerationDialog(null);
      setModerationNote("");
      setSelectedFeedbackId(null);
      toast.success(result.message || "Feedback moderated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete feedback");
      return result as { message?: string };
    },
    onSuccess: (result) => {
      invalidateFeedback();
      setDeleteFeedbackId(null);
      setSelectedFeedbackId(null);
      toast.success(result.message || "Feedback deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openModerationDialog = (feedbackId: string, action: "approved" | "rejected") => {
    setModerationNote("");
    setModerationDialog({ feedbackId, action });
  };

  const confirmModeration = () => {
    if (!moderationDialog) return;

    moderateMutation.mutate({
      feedbackId: moderationDialog.feedbackId,
      status: moderationDialog.action,
      moderationNote: moderationNote.trim() || undefined,
    });
  };

  const selectedMedia = viewingMedia
    ? (viewingMedia.feedback.media ?? []).map((item) => ({ type: item.type, url: item.url }))
    : [];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total" value={stats.total.toLocaleString()} icon={<MessageSquare className="size-4" />} />
        <Metric label="Pending" value={stats.pending.toLocaleString()} icon={<Clock className="size-4" />} tone="amber" />
        <Metric label="Approved" value={stats.approved.toLocaleString()} icon={<CheckCircle2 className="size-4" />} tone="green" />
        <Metric label="Avg. Rating" value={stats.averageRating.toFixed(1)} icon={<Star className="size-4" />} tone="blue" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by comment, submitter, project, or ID"
              className="h-10 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={statusFilter === filter.value ? "default" : "outline"}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                }}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
            {statusFilter === "all" ? "All Feedback" : `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)} Feedback`}
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {pagination.total.toLocaleString()} result{pagination.total === 1 ? "" : "s"}
          </p>
        </div>

        {isLoading && feedbacks.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading feedback...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">
            No feedback found for the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {feedbacks.map((item) => (
              <FeedbackRow
                key={item.id}
                feedback={item}
                onView={() => setSelectedFeedbackId(item.id)}
                onApprove={() => openModerationDialog(item.id, "approved")}
                onReject={() => openModerationDialog(item.id, "rejected")}
                onDelete={() => setDeleteFeedbackId(item.id)}
                isBusy={moderateMutation.isPending || deleteMutation.isPending}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <FeedbackDetailSheet
        feedback={selectedFeedback}
        open={Boolean(selectedFeedback)}
        onClose={() => setSelectedFeedbackId(null)}
        onApprove={(feedbackId) => openModerationDialog(feedbackId, "approved")}
        onReject={(feedbackId) => openModerationDialog(feedbackId, "rejected")}
        onDelete={(feedbackId) => setDeleteFeedbackId(feedbackId)}
        onViewMedia={(feedback, index) => setViewingMedia({ feedback, index })}
        isBusy={moderateMutation.isPending || deleteMutation.isPending}
      />

      <Dialog
        open={Boolean(moderationDialog)}
        onOpenChange={(open) => {
          if (!open) setModerationDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationDialog?.action === "approved" ? "Approve Feedback" : "Reject Feedback"}
            </DialogTitle>
            <DialogDescription>
              {moderationDialog?.action === "approved"
                ? "Approved feedback will appear in the project feedback tab."
                : "Rejected feedback stays hidden from public project pages."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="moderation-note">
              Moderation Note
            </label>
            <Textarea
              id="moderation-note"
              value={moderationNote}
              onChange={(event) => setModerationNote(event.target.value)}
              placeholder="Optional note for this decision"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModerationDialog(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={moderationDialog?.action === "rejected" ? "destructive" : "default"}
              onClick={confirmModeration}
              disabled={moderateMutation.isPending}
            >
              {moderateMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteFeedbackId)} onOpenChange={(open) => !open && setDeleteFeedbackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the feedback record and attempts to delete its uploaded attachments from MinIO.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteFeedbackId && deleteMutation.mutate(deleteFeedbackId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MediaViewer
        media={selectedMedia}
        initialIndex={viewingMedia?.index ?? 0}
        open={Boolean(viewingMedia)}
        onClose={() => setViewingMedia(null)}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "slate" | "amber" | "green" | "blue";
}) {
  const toneClass = {
    slate: "text-primary bg-primary/10",
    amber: "text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300",
    green: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "text-sky-600 bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", toneClass)}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function FeedbackRow({
  feedback,
  onView,
  onApprove,
  onReject,
  onDelete,
  isBusy,
}: {
  feedback: AdminFeedbackItem;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isBusy?: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onView}>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
              {getInitials(authorName(feedback))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-950 dark:text-white">{authorName(feedback)}</span>
                {feedback.isAnonymous && (
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500 dark:border-slate-800">
                    Anonymous
                  </span>
                )}
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold capitalize", getStatusClass(feedback.status))}>
                  {feedback.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatDate(feedback.createdAt)} on {projectLabel(feedback)}
              </p>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {feedback.comment}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{categoryLabels[feedback.category] || feedback.category}</span>
                {feedback.rating ? <Rating value={feedback.rating} /> : null}
                {feedback.media.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="size-3.5" />
                    {feedback.media.length} attachment{feedback.media.length === 1 ? "" : "s"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="size-3.5" />
                  {feedback.helpfulCount}
                </span>
              </div>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button type="button" variant="outline" onClick={onView}>
            <Eye className="size-4" />
            View
          </Button>
          {feedback.status === "pending" && (
            <>
              <Button type="button" onClick={onApprove} disabled={isBusy}>
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
              <Button type="button" variant="destructive" onClick={onReject} disabled={isBusy}>
                <XCircle className="size-4" />
                Reject
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={onDelete} disabled={isBusy}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn("size-3.5", index < value ? "fill-current" : "text-slate-300")}
        />
      ))}
    </span>
  );
}

function FeedbackDetailSheet({
  feedback,
  open,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onViewMedia,
  isBusy,
}: {
  feedback: AdminFeedbackItem | null;
  open: boolean;
  onClose: () => void;
  onApprove: (feedbackId: string) => void;
  onReject: (feedbackId: string) => void;
  onDelete: (feedbackId: string) => void;
  onViewMedia: (feedback: AdminFeedbackItem, index: number) => void;
  isBusy?: boolean;
}) {
  if (!feedback) return null;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 pr-12 dark:border-slate-800">
          <SheetTitle>Feedback Details</SheetTitle>
          <SheetDescription>
            Submitted {formatDate(feedback.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-1 text-xs font-bold capitalize", getStatusClass(feedback.status))}>
              {feedback.status}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {categoryLabels[feedback.category] || feedback.category}
            </span>
            {feedback.isAnonymous && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Posted anonymously
              </span>
            )}
          </div>

          <DetailBlock title="Submitter">
            <p className="font-extrabold text-slate-950 dark:text-white">{authorName(feedback)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{feedback.user?.email || "No email available"}</p>
          </DetailBlock>

          <DetailBlock title="Project">
            <Link href={projectHref(feedback)} className="font-extrabold text-primary hover:underline">
              {projectLabel(feedback)}
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {[feedback.project?.municipality, feedback.project?.province].filter(Boolean).join(", ") || feedback.projectId}
            </p>
          </DetailBlock>

          {feedback.rating ? (
            <DetailBlock title="Rating">
              <Rating value={feedback.rating} />
            </DetailBlock>
          ) : null}

          <DetailBlock title="Feedback">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">{feedback.comment}</p>
          </DetailBlock>

          {feedback.media.length > 0 && (
            <DetailBlock title={`Attachments (${feedback.media.length})`}>
              <div className="grid grid-cols-2 gap-2">
                {feedback.media.map((item, index) => {
                  const src = getFullUrl(item.url);

                  return (
                    <button
                      type="button"
                      key={`${item.url}-${index}`}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left dark:border-slate-800 dark:bg-slate-900"
                      onClick={() => onViewMedia(feedback, index)}
                    >
                      {item.type === "image" && src ? (
                        <img src={src} alt={item.caption || "Feedback attachment"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
                          <Video className="size-8" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </DetailBlock>
          )}

          {feedback.moderationNote && (
            <DetailBlock title="Moderation Note">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">{feedback.moderationNote}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Moderated {formatDate(feedback.moderatedAt)}
              </p>
            </DetailBlock>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {feedback.status === "pending" && (
              <>
                <Button type="button" onClick={() => onApprove(feedback.id)} disabled={isBusy}>
                  <CheckCircle2 className="size-4" />
                  Approve
                </Button>
                <Button type="button" variant="destructive" onClick={() => onReject(feedback.id)} disabled={isBusy}>
                  <XCircle className="size-4" />
                  Reject
                </Button>
              </>
            )}
            <Button type="button" variant="outline" onClick={() => onDelete(feedback.id)} disabled={isBusy}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      {children}
    </section>
  );
}
