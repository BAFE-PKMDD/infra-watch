"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ArrowUpDown,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { getActivityFeed } from "@/actions/query/activity-feed.query";
import { useNotifications } from "@/providers/notification-provider";
import { FeedbackFeedCard } from "./feedback-feed-card";
import { IssueFeedCard } from "./issue-feed-card";
import { FeedbackComposer } from "./feedback-composer";
import type { ActivityFeedFilter } from "@/types/activity-feed.types";

const TYPE_FILTERS: { value: ActivityFeedFilter; label: string; icon: typeof Layers }[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "feedback", label: "Feedback", icon: MessageSquare },
  { value: "issue", label: "Reported Issues", icon: AlertTriangle },
] as const;


const ITEMS_PER_PAGE = 10;

export function FeedbackFeedClient() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityFeedFilter>("all");

  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const queryClient = useQueryClient();
  const { notifications } = useNotifications();
  const lastNotificationIdRef = useRef<string | null>(null);

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Listen for relevant notifications to auto-refresh
  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];
    if (!latestNotification) return;

    if (latestNotification.id === lastNotificationIdRef.current) return;

    const refreshTypes = [
      "feedback_submitted",
      "feedback_approved",
      "feedback_rejected",
      "comment_posted",
      "comment_rejected",
      "comment_approved",
      "issue_created",
      "issue_status_changed",
    ];

    if (refreshTypes.includes(latestNotification.type)) {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      lastNotificationIdRef.current = latestNotification.id;
    }
  }, [notifications, queryClient]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["activity-feed", debouncedSearch, typeFilter, sort],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getActivityFeed({
        page: pageParam,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
        type: typeFilter,

        sort,
      });
      return result;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // IntersectionObserver for auto-fetching next page
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single list
  const feedItems = data?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  return (
    <div className="min-w-0">
      {/* Composer — only show after feed has loaded */}
      {!isLoading && <FeedbackComposer />}

      {/* Filters — only show after feed has loaded */}
      {!isLoading && (
        <div className="mb-6 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback, issues, or projects..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e3a5f]/30 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          {/* Type filter pills */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {TYPE_FILTERS.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => {
                    setTypeFilter(tf.value);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === tf.value
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-white dark:bg-[#13233c]/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3a5f]/30 hover:border-sky-300 dark:hover:border-sky-700"
                    }`}
                >
                  <tf.icon className="w-3.5 h-3.5" />
                  {tf.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#13233c]/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3a5f]/30 hover:border-sky-300 dark:hover:border-sky-700 transition-all self-start sm:self-auto"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sort === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>


        </div>
      )}

      {/* Feed list */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons — composer + search/filters + feed cards
          <>
            {/* Composer skeleton */}
            <div className="bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e3a5f]/30 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-[#13233c]/60 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-16 w-full bg-slate-100 dark:bg-[#13233c]/40 rounded-xl" />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="h-7 w-16 bg-slate-100 dark:bg-[#13233c]/40 rounded-full" />
                      <div className="h-7 w-16 bg-slate-100 dark:bg-[#13233c]/40 rounded-full" />
                      <div className="h-7 w-16 bg-slate-100 dark:bg-[#13233c]/40 rounded-full" />
                    </div>
                    <div className="h-8 w-20 bg-slate-200 dark:bg-[#13233c]/60 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search & filter skeleton */}
            <div className="space-y-3 animate-pulse">
              <div className="h-10 w-full bg-slate-100 dark:bg-[#13233c]/40 rounded-xl" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-7 w-12 bg-slate-100 dark:bg-[#13233c]/40 rounded-lg" />
                  <div className="h-7 w-16 bg-slate-100 dark:bg-[#13233c]/40 rounded-lg" />
                  <div className="h-7 w-18 bg-slate-100 dark:bg-[#13233c]/40 rounded-lg" />
                </div>
                <div className="h-7 w-20 bg-slate-100 dark:bg-[#13233c]/40 rounded-lg" />
              </div>
            </div>

            {/* Feed card skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#0d1526] rounded-2xl border border-slate-200 dark:border-[#1e3a5f]/30 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#13233c]/60" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-[#13233c]/60 rounded mb-1.5" />
                    <div className="h-3 w-48 bg-slate-100 dark:bg-[#13233c]/40 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-200 dark:bg-[#13233c]/60 rounded mb-2" />
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-[#13233c]/40 rounded mb-4" />
                <div className="flex gap-4">
                  <div className="h-8 w-20 bg-slate-100 dark:bg-[#13233c]/40 rounded-lg" />
                  <div className="h-8 w-20 bg-slate-100 dark:bg-[#13233c]/40 rounded-lg" />
                </div>
              </div>
            ))}
          </>
        ) : feedItems.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#13233c]/60 mx-auto mb-4">
              <Layers className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              No activity found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {debouncedSearch || typeFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Once citizens submit feedback or report issues on INFRA projects, it will appear here."}
            </p>
          </div>
        ) : (
          <>
            {feedItems.map((item) =>
              item.type === "feedback" ? (
                <FeedbackFeedCard key={`feedback-${item.id}`} item={item} />
              ) : (
                <IssueFeedCard key={`issue-${item.id}`} item={item} />
              ),
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading indicator for next page */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                  Loading more...
                </span>
              </div>
            )}

            {/* End of feed indicator */}
            {!hasNextPage && feedItems.length > 0 && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 pb-4 pt-2">
                Showing all {totalCount} items
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
