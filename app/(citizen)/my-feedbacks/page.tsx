"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquareDot,
  Play,
  Search,
  Star,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFullUrl } from "@/lib/minio-url";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type FeedbackStatus = "pending" | "approved" | "rejected";

type FeedbackMedia = {
  type: "image" | "video";
  url: string;
  caption?: string;
};

interface FeedbackItem {
  id: string;
  projectId: string;
  rating: number | null;
  comment: string;
  category: string;
  media: FeedbackMedia[];
  isAnonymous: boolean;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  moderationNote?: string | null;
  project: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  quality: "Project Quality",
  progress: "Project Progress",
  concerns: "Concerns & Issues",
  general: "General Feedback",
};

const STATUS_CONFIG: Record<
  FeedbackStatus,
  {
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
    borderColor: "border-rose-200 dark:border-rose-800",
  },
};

const ITEMS_PER_PAGE = 10;

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-8 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="mb-3 flex items-center gap-4">
            <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <div key={star} className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          </div>
          <div className="mb-4 space-y-2">
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <MessageSquareDot className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        No Feedback Yet
      </h3>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        You have not submitted feedback yet. Share your observations on infrastructure projects.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Browse Projects
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-900/20">
      <XCircle className="mx-auto mb-3 h-12 w-12 text-rose-600 dark:text-rose-400" />
      <h3 className="mb-2 text-lg font-semibold text-rose-900 dark:text-rose-100">
        Failed to Load Feedback
      </h3>
      <p className="text-sm text-rose-700 dark:text-rose-300">{message}</p>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
      <Search className="mx-auto mb-3 h-12 w-12 text-slate-400" />
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        No Results Found
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Try adjusting your search or filter criteria.
      </p>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  count,
  label,
  className,
}: {
  icon: LucideIcon;
  count: number;
  label: string;
  className: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8" />
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm">{label}</p>
        </div>
      </div>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-slate-300 dark:text-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

function MediaAttachment({
  media,
  index,
  onView,
}: {
  media: FeedbackMedia;
  index: number;
  onView: (type: "image" | "video", url: string) => void;
}) {
  const mediaUrl = getFullUrl(media.url);

  if (!mediaUrl) return null;

  return (
    <button
      type="button"
      className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 transition-opacity hover:opacity-90 dark:border-slate-700"
      onClick={() => onView(media.type, mediaUrl)}
    >
      {media.type === "image" ? (
        <Image
          src={mediaUrl}
          alt={media.caption || `Attachment ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          unoptimized
        />
      ) : (
        <div className="relative h-full w-full">
          <video src={mediaUrl} className="h-full w-full object-cover" preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95">
              <Play className="ml-1 h-6 w-6 text-slate-900" fill="currentColor" />
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function FeedbackCard({
  item,
  isMediaExpanded,
  onToggleMedia,
  onViewMedia,
}: {
  item: FeedbackItem;
  isMediaExpanded: boolean;
  onToggleMedia: () => void;
  onViewMedia: (type: "image" | "video", url: string) => void;
}) {
  const status = STATUS_CONFIG[item.status];
  const StatusIcon = status.icon;
  const projectHref = `/projects/${item.project?.id ?? item.projectId}?tab=feedback`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link href={projectHref} className="group">
            <h3 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-primary dark:text-white">
              {item.project?.name || "Unknown Project"}
            </h3>
            <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
              {item.project?.code || item.projectId}
            </p>
          </Link>
        </div>
        <div className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 ${status.bgColor} ${status.borderColor}`}>
          <StatusIcon className={`h-4 w-4 ${status.color}`} />
          <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {item.moderationNote && (
        <div
          className={cn(
            "mb-4 rounded-lg border p-3",
            item.status === "rejected"
              ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20"
              : item.status === "approved"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                : "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800",
          )}
        >
          <p className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {item.status === "rejected" ? "Rejection Reason:" : "Moderator's Note:"}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {item.moderationNote}
          </p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {CATEGORY_LABELS[item.category] || item.category}
        </span>
        {item.rating ? <RatingStars rating={item.rating} /> : null}
      </div>

      <p className="mb-4 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
        {item.comment}
      </p>

      {item.media.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onToggleMedia}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-primary dark:text-slate-300 dark:hover:text-blue-300"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isMediaExpanded ? "rotate-180" : ""}`} />
            {item.media.length} Attachment{item.media.length > 1 ? "s" : ""}
          </button>
          {isMediaExpanded && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {item.media.map((media, index) => (
                <MediaAttachment key={`${media.url}-${index}`} media={media} index={index} onView={onViewMedia} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>Submitted {format(new Date(item.createdAt), "MMM d, yyyy")}</span>
          {item.isAnonymous && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
              Anonymous
            </span>
          )}
        </div>
        <Link
          href={projectHref}
          className="flex items-center gap-1 font-medium text-primary hover:text-primary/80 dark:text-blue-300"
        >
          View Project
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-slate-700 dark:text-slate-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function MediaViewer({
  media,
  onClose,
}: {
  media: { type: "image" | "video"; url: string } | null;
  onClose: () => void;
}) {
  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] w-full max-w-7xl" onClick={(event) => event.stopPropagation()}>
        {media.type === "image" ? (
          <Image
            src={media.url}
            alt="Full size attachment"
            width={1920}
            height={1080}
            className="h-full w-full rounded-lg object-contain"
            priority
            unoptimized
          />
        ) : (
          <video src={media.url} controls autoPlay className="max-h-[90vh] w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}

export default function MyFeedbacksPage() {
  const { user, isLoading: isAuthPending } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMedia, setExpandedMedia] = useState<Record<string, boolean>>({});
  const [viewingMedia, setViewingMedia] = useState<{ type: "image" | "video"; url: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-feedbacks"],
    queryFn: async () => {
      const response = await fetch("/api/my-feedbacks");
      if (!response.ok) {
        if (response.status === 401) throw new Error("Please sign in to view your feedback.");
        throw new Error("Failed to fetch feedback.");
      }
      return (await response.json()) as { data: FeedbackItem[] };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!isAuthPending && !user) {
      router.push("/sign-in?redirect=/my-feedbacks");
    }
  }, [isAuthPending, router, user]);

  const allFeedbacks = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredFeedbacks = useMemo(() => {
    let filtered = allFeedbacks;

    if (statusFilter !== "all") {
      filtered = filtered.filter((feedback) => feedback.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (feedback) =>
          feedback.project?.name.toLowerCase().includes(query) ||
          feedback.project?.code.toLowerCase().includes(query) ||
          feedback.comment.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [allFeedbacks, searchQuery, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: allFeedbacks.filter((feedback) => feedback.status === "pending").length,
      approved: allFeedbacks.filter((feedback) => feedback.status === "approved").length,
      rejected: allFeedbacks.filter((feedback) => feedback.status === "rejected").length,
    }),
    [allFeedbacks],
  );

  const totalPages = Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedFeedbacks = filteredFeedbacks.slice(startIndex, endIndex);

  const toggleMedia = useCallback((id: string) => {
    setExpandedMedia((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const handleViewMedia = useCallback((type: "image" | "video", url: string) => {
    setViewingMedia({ type, url });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader activeItem="home" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-700">
              <MessageSquareDot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                My Feedbacks
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                View and manage all feedback you submitted.
              </p>
            </div>
          </div>
        </div>

        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState message={error instanceof Error ? error.message : "An error occurred."} />}
        {!isLoading && !error && data && allFeedbacks.length === 0 && <EmptyState />}

        {!isLoading && !error && data && allFeedbacks.length > 0 && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by project name, code, or comment..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value ?? "all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full bg-white sm:w-48 dark:bg-slate-900">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatsCard
                icon={Clock}
                count={stats.pending}
                label="Pending Review"
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
              />
              <StatsCard
                icon={CheckCircle2}
                count={stats.approved}
                label="Approved"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              />
              <StatsCard
                icon={XCircle}
                count={stats.rejected}
                label="Rejected"
                className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200"
              />
            </div>

            {filteredFeedbacks.length === 0 && <NoResultsState />}

            {paginatedFeedbacks.length > 0 && (
              <>
                <div className="space-y-4">
                  {paginatedFeedbacks.map((item) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      isMediaExpanded={expandedMedia[item.id] || false}
                      onToggleMedia={() => toggleMedia(item.id)}
                      onViewMedia={handleViewMedia}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={filteredFeedbacks.length}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <MediaViewer media={viewingMedia} onClose={() => setViewingMedia(null)} />
    </div>
  );
}
