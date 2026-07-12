"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notification-provider";

type NotificationItem = ReturnType<typeof useNotifications>["notifications"][number];

const ITEMS_PER_PAGE = 10;

function getMetadataString(notification: NotificationItem, key: string) {
  const value = notification.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function formatNotificationTime(value: NotificationItem["createdAt"]) {
  if (!value) return "";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
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
        <Bell className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        No Notifications Yet
      </h3>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Updates for your feedback and reported issues will appear here.
      </p>
      <Link
        href="/projects"
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Browse Projects
      </Link>
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

function NotificationCard({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick: () => void;
}) {
  const projectId = getMetadataString(notification, "projectId");
  const projectName = getMetadataString(notification, "projectName");
  const link = projectId ? `/projects/${projectId}` : null;

  const content = (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border bg-white transition-all hover:shadow-md dark:bg-slate-900 ${
        !notification.isRead
          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              !notification.isRead
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            {!notification.isRead ? (
              <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <CheckCheck className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3
                className={`text-base font-semibold ${
                  !notification.isRead
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {notification.title}
              </h3>
              {!notification.isRead && (
                <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              )}
            </div>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              {notification.message}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
              {projectName && (
                <span className="font-medium text-primary dark:text-blue-300">
                  {projectName}
                </span>
              )}
              <span className="text-blue-500 dark:text-blue-400">
                {formatNotificationTime(notification.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return link ? (
    <Link href={link} className="block">
      {content}
    </Link>
  ) : (
    content
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

export default function MyNotificationsPage() {
  const { user, isLoading: isAuthPending } = useAuth();
  const router = useRouter();
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isAuthPending && !user) {
      router.push("/sign-in?redirect=/my-notifications");
    }
  }, [isAuthPending, router, user]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (statusFilter === "unread") {
      filtered = filtered.filter((notification) => !notification.isRead);
    } else if (statusFilter === "read") {
      filtered = filtered.filter((notification) => notification.isRead);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query) ||
          notification.type.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [notifications, searchQuery, statusFilter]);

  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.isRead).length,
      read: notifications.filter((notification) => notification.isRead).length,
    }),
    [notifications],
  );

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  const handleNotificationClick = useCallback(
    async (notification: NotificationItem) => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
    },
    [markAsRead],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader activeItem="home" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  My Notifications
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Stay updated on your feedback, E-Reports, and project activity.
                </p>
              </div>
            </div>
            {stats.unread > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:flex"
              >
                <CheckCircle className="h-4 w-4" />
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {isLoading && <LoadingSkeleton />}
        {!isLoading && notifications.length === 0 && <EmptyState />}

        {!isLoading && notifications.length > 0 && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
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
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {stats.unread > 0 && (
              <div className="mb-6 sm:hidden">
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark All as Read
                </button>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatsCard
                icon={Bell}
                count={stats.total}
                label="Total Notifications"
                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
              />
              <StatsCard
                icon={Check}
                count={stats.unread}
                label="Unread"
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
              />
              <StatsCard
                icon={CheckCheck}
                count={stats.read}
                label="Read"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              />
            </div>

            {filteredNotifications.length === 0 && <NoResultsState />}

            {paginatedNotifications.length > 0 && (
              <>
                <div className="space-y-4">
                  {paginatedNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={filteredNotifications.length}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
