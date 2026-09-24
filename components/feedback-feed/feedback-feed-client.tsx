"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ArrowUpDown,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Layers,
  Bookmark,
} from "lucide-react";
import { getActivityFeed } from "@/actions/query/activity-feed.query";
import { useNotifications } from "@/providers/notification-provider";
import { getUserPostInteractionsAction } from "@/actions/mutation/post-interactions.mutation";
import { FeedbackFeedCard } from "./feedback-feed-card";
import { FeedContributionActions } from "./feed-contribution-actions";
import { IssueFeedCard } from "./issue-feed-card";
import type { ActivityFeedFilter } from "@/types/activity-feed.types";

const TYPE_FILTERS: { value: ActivityFeedFilter; label: string; icon: typeof Layers | typeof Bookmark }[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "feedback", label: "Feedback", icon: MessageSquare },
  { value: "issue", label: "Reported Issues", icon: AlertTriangle },
  { value: "saved", label: "Saved", icon: Bookmark },
] as const;

const ITEMS_PER_PAGE = 10;

export function FeedbackFeedClient() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityFeedFilter>("all");
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);

  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const queryClient = useQueryClient();
  const { notifications } = useNotifications();
  const lastNotificationIdRef = useRef<string | null>(null);

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load saved posts from localStorage and sync from server
  useEffect(() => {
    if (typeof window !== "undefined") {
      const localIds: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("post_interested_") && localStorage.getItem(key) === "true") {
          localIds.push(key.replace("post_interested_", ""));
        }
      }
      setSavedPostIds(localIds);

      // Check URL query parameters for ?filter=saved
      const params = new URLSearchParams(window.location.search);
      if (params.get("filter") === "saved") {
        setTypeFilter("saved");
      }
    }

    getUserPostInteractionsAction()
      .then((res) => {
        if (res.savedPostIds.length > 0) {
          setSavedPostIds((prev) => Array.from(new Set([...prev, ...res.savedPostIds])));
        }
      })
      .catch(() => {});
  }, []);

  // Listen to post-saved-change custom event
  useEffect(() => {
    const handleSavedChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ postId: string; isSaved: boolean }>;
      if (customEvent.detail) {
        setSavedPostIds((prev) => {
          const next = new Set(prev);
          if (customEvent.detail.isSaved) {
            next.add(customEvent.detail.postId);
          } else {
            next.delete(customEvent.detail.postId);
          }
          return Array.from(next);
        });
      }
    };

    window.addEventListener("post-saved-change", handleSavedChange);
    return () => window.removeEventListener("post-saved-change", handleSavedChange);
  }, []);

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
  } = useInfiniteQuery({
    queryKey: ["activity-feed", debouncedSearch, typeFilter === "saved" ? "all" : typeFilter, sort],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getActivityFeed({
        page: pageParam,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
        type: typeFilter === "saved" ? "all" : typeFilter,
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
  const allFeedItems = data?.pages.flatMap((page) => page.data) ?? [];
  const feedItems = typeFilter === "saved"
    ? allFeedItems.filter((item) => savedPostIds.includes(item.id))
    : allFeedItems;
  const totalCount = typeFilter === "saved" ? feedItems.length : (data?.pages[0]?.pagination.total ?? 0);

  return (
    <div className="min-w-0">
      <FeedContributionActions />

      {/* Filters appear once the first feed request is complete. */}
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-[#1e3a5f]/30 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Type filter pills */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {TYPE_FILTERS.map((tf) => {
                const isSelected = typeFilter === tf.value;
                const countBadge =
                  tf.value === "saved" && savedPostIds.length > 0 ? (
                    <span
                      className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {savedPostIds.length}
                    </span>
                  ) : null;

                return (
                  <button
                    key={tf.value}
                    onClick={() => {
                      setTypeFilter(tf.value);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <tf.icon className="w-3.5 h-3.5" />
                    {tf.label}
                    {countBadge}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              {sort === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>
      )}

      {/* Feed list */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {/* Search and filter skeleton */}
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
                className="bg-white dark:bg-[#0d1526] rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse"
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
          <div className="text-center py-16 bg-white dark:bg-[#0d1526] rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-2xs">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto mb-4 border border-amber-200/60 dark:border-amber-900/40">
              {typeFilter === "saved" ? (
                <Bookmark className="w-8 h-8" />
              ) : (
                <Layers className="w-8 h-8 text-slate-500 dark:text-slate-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {typeFilter === "saved" ? "No Saved Posts Yet" : "No Activity Found"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
              {typeFilter === "saved"
                ? "Posts you mark as Interested or save will appear here so you can easily return to them."
                : debouncedSearch
                ? `No items match "${debouncedSearch}". Try another search term.`
                : "Once citizens submit feedback or report issues on INFRA projects, they will appear here."}
            </p>
            {typeFilter === "saved" && (
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                Browse All Posts
              </button>
            )}
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
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                  Loading more...
                </span>
              </div>
            )}

            {/* End of feed indicator */}
            {!hasNextPage && feedItems.length > 0 && (
              <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 pb-4 pt-2">
                Showing {feedItems.length} of {totalCount} item{totalCount === 1 ? "" : "s"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
