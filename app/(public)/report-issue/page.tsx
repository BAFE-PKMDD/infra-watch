"use client";

import { memo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

const ITEMS_PER_PAGE = 10;

type IssueStatus = "pending" | "reviewing" | "resolved" | "closed";

type IssueItem = {
  id: string;
  ticketNumber: string;
  projectId?: string | null;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  issueType: string;
  issueDescription: string;
  status: IssueStatus;
  fmrStatus?: IssueStatus;
  createdAt: string;
  project?: {
    id: string | null;
    name: string;
    code: string | null;
  } | null;
};

type IssuesResponse = {
  success: boolean;
  data: IssueItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const statusConfig: Record<IssueStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending Review",
    color: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock,
  },
  reviewing: {
    label: "Under Review",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    icon: AlertCircle,
  },
  resolved: {
    label: "Resolved",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    color: "border-slate-200 bg-slate-50 text-slate-700",
    icon: XCircle,
  },
};

function normalizeIssueStatus(issue: IssueItem): IssueStatus {
  if (issue.fmrStatus) return issue.fmrStatus;
  if (issue.status === "pending" || issue.status === "reviewing" || issue.status === "resolved" || issue.status === "closed") return issue.status;
  return "pending";
}

async function fetchIssues(params: URLSearchParams) {
  const response = await fetch(`/api/issues?${params.toString()}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Failed to fetch issues");
  return data as IssuesResponse;
}

export default function IssuesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const prevFiltersRef = useRef({ searchQuery, statusFilter, startDate, endDate });
  if (
    prevFiltersRef.current.searchQuery !== searchQuery ||
    prevFiltersRef.current.statusFilter !== statusFilter ||
    prevFiltersRef.current.startDate !== startDate ||
    prevFiltersRef.current.endDate !== endDate
  ) {
    prevFiltersRef.current = { searchQuery, statusFilter, startDate, endDate };
    if (currentPage !== 1) setCurrentPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["issues", debouncedSearchQuery, statusFilter, startDate, endDate, currentPage],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      });
      if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      return fetchIssues(params);
    },
  });

  const issues = data?.data ?? [];
  const pagination = data?.pagination;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <section className="relative h-[280px] overflow-hidden bg-slate-950">
        <Image
          src="/hero/main-background.png"
          alt="Infrastructure project"
          fill
          className="object-cover opacity-45"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950/90" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Community Reporting</p>
            <h1 className="mb-3 text-3xl font-bold text-white md:text-4xl">Reported Issues</h1>
            <p className="max-w-3xl text-sm text-slate-100 md:text-base">
              Track and monitor issues reported by citizens across INFRA projects
            </p>
            <Button asChild className="mt-5 bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/report-issue/new">
                <Plus className="mr-2 size-4" /> Report New Issue
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by description or location..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 border-slate-200 bg-white pl-9 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 border-slate-200 bg-white pl-9 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value as IssueStatus | "all")}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-slate-900 sm:w-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <Filter className="size-3.5 text-slate-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewing">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
                <div key={index} className="flex h-20 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Search className="size-10 text-slate-400" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">No reported issues found</h3>
              <p className="mx-auto max-w-md text-center text-slate-500 dark:text-slate-400">Try changing the search, date range, or status filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-100">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-100">Date Reported</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-100">Issue Details</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-100">Location</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-100">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issues.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {pagination && pagination.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row dark:border-slate-800"
          >
            <div className="order-2 text-sm text-slate-600 sm:order-1 dark:text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>

            <div className="order-1 flex items-center gap-2 sm:order-2">
              <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={!pagination.hasPrev} className="size-9 border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
                  .filter((page) => page === 1 || page === pagination.totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && <MoreHorizontal className="size-4 text-slate-500" />}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={`size-9 p-0 ${currentPage === page ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>
              <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={!pagination.hasNext} className="size-9 border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}

const IssueRow = memo(({ issue }: { issue: IssueItem }) => {
  const status = normalizeIssueStatus(issue);
  const StatusIcon = statusConfig[status].icon;

  return (
    <tr className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="whitespace-nowrap px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[status].color}`}>
          <StatusIcon className="size-3.5" />
          {statusConfig[status].label}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-slate-400 dark:text-slate-500" />
          <span>{new Date(issue.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-1">
          <span className="line-clamp-2 font-medium md:max-w-xs">{issue.issueDescription}</span>
          <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">{issue.issueType}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <div className="flex flex-col">
            <span className="font-medium">{[issue.barangay, issue.city].filter(Boolean).join(", ") || "N/A"}</span>
            {issue.streetLandmark && <span className="text-xs text-slate-500 dark:text-slate-500">{issue.streetLandmark}</span>}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right">
        <Link href={`/report-issue/${issue.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300">
          View Details
          <ArrowUpRight className="size-3.5" />
        </Link>
      </td>
    </tr>
  );
});

IssueRow.displayName = "IssueRow";
