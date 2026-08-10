"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";

type IssueStatus = "pending" | "reviewing" | "resolved" | "closed";

interface IssueItem {
  id: string;
  projectId?: string | null;
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  issueType: string;
  issueDescription: string;
  dateNoticed: string;
  status: IssueStatus;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  responseCount: number;
  project?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const STATUS_CONFIG: Record<
  IssueStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: LucideIcon;
  }
> = {
  pending: {
    label: "Pending Review",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  reviewing: {
    label: "Under Review",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/20",
    borderColor: "border-slate-200 dark:border-slate-800",
    icon: XCircle,
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
          <div className="mb-4 space-y-2">
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
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
        <AlertCircle className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        No Issues Reported Yet
      </h3>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        You have not reported any issues yet. Help improve infrastructure projects by reporting concerns you observe.
      </p>
      <Link href="/report-issue/new">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Report First Issue
        </Button>
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-900/20">
      <XCircle className="mx-auto mb-3 h-12 w-12 text-rose-600 dark:text-rose-400" />
      <h3 className="mb-2 text-lg font-semibold text-rose-900 dark:text-rose-100">
        Failed to Load Issues
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

function IssueCard({ item }: { item: IssueItem }) {
  const status = STATUS_CONFIG[item.status];
  const StatusIcon = status.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.bgColor} ${status.borderColor}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
              <span className={status.color}>{status.label}</span>
            </span>
            {item.responseCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {item.responseCount} {item.responseCount === 1 ? "response" : "responses"}
              </Badge>
            )}
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            {item.issueDescription}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{item.city || "Unknown City"}, {item.province || "Unknown Province"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Reported {format(new Date(item.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <Badge variant="outline">{item.issueType}</Badge>
        <Link href={`/my-issues/${item.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </Button>
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

export default function MyIssuesPage() {
  const { user, isLoading: isAuthPending } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-issues"],
    queryFn: async () => {
      const response = await fetch("/api/my-issues");
      if (!response.ok) {
        if (response.status === 401) throw new Error("Please sign in to view your issues.");
        throw new Error("Failed to fetch issues.");
      }
      return (await response.json()) as { data: IssueItem[] };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!isAuthPending && !user) {
      router.push("/sign-in?redirect=/my-issues");
    }
  }, [isAuthPending, router, user]);

  const allIssues = useMemo(() => data?.data ?? [], [data?.data]);

  const filteredIssues = useMemo(() => {
    let filtered = allIssues;

    if (statusFilter !== "all") {
      filtered = filtered.filter((issue) => issue.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.issueDescription.toLowerCase().includes(query) ||
          issue.city.toLowerCase().includes(query) ||
          issue.issueType.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [allIssues, searchQuery, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: allIssues.filter((issue) => issue.status === "pending").length,
      reviewing: allIssues.filter((issue) => issue.status === "reviewing").length,
      resolved: allIssues.filter((issue) => issue.status === "resolved").length,
    }),
    [allIssues],
  );

  const totalPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader activeItem="home" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  My Issues
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Track the status of issues you reported and view official responses.
                </p>
              </div>
            </div>
            <Link href="/report-issue/new">
              <Button className="gap-2 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                Report an Issue
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && <LoadingSkeleton />}
        {error && <ErrorState message={error instanceof Error ? error.message : "An error occurred."} />}
        {!isLoading && !error && data && allIssues.length === 0 && <EmptyState />}

        {!isLoading && !error && data && allIssues.length > 0 && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by description, location, or type..."
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
                  <SelectItem value="reviewing">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
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
                icon={AlertCircle}
                count={stats.reviewing}
                label="Under Review"
                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
              />
              <StatsCard
                icon={CheckCircle2}
                count={stats.resolved}
                label="Resolved"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              />
            </div>

            {filteredIssues.length === 0 && <NoResultsState />}

            {paginatedIssues.length > 0 && (
              <>
                <div className="space-y-4">
                  {paginatedIssues.map((item) => (
                    <IssueCard key={item.id} item={item} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={filteredIssues.length}
                    onPageChange={handlePageChange}
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
