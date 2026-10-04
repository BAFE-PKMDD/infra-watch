"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { notifyTutorialAction } from "@/lib/tours/events";
import { runTutorialMutation } from "@/lib/tours/sandbox";
import { TutorialModeNotice, useTutorialSandbox, type TutorialSandboxContextValue } from "@/components/admin/tour/tutorial-sandbox";

type IssueStatus = "all" | "pending" | "reviewing" | "resolved" | "closed";


type AdminIssue = {
  id: string;
  ticketNumber: string;
  projectName: string | null;
  category?: string | null;
  reportedFarmOperation?: string | null;
  farmOperation?: string | null;
  issueType: string;
  issueDescription: string;
  status: Exclude<IssueStatus, "all">;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  reporterName: string;
  isAnonymous: boolean;
  createdAt: string;

};

type IssueListResponse = {
  success: boolean;
  data: AdminIssue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type IssueStatsResponse = {
  success: boolean;
  data: {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    closed: number;
  };
};

const ITEMS_PER_PAGE = 10;

const statusOptions: Array<{ value: IssueStatus; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending Review" },
  { value: "reviewing", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];


function formatDate(value: string | Date | null | undefined) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusLabel(status: AdminIssue["status"]) {
  return {
    pending: "Pending Review",
    reviewing: "Under Review",
    resolved: "Resolved",
    closed: "Closed",
  }[status];
}

function statusClass(status: AdminIssue["status"]) {
  return {
    pending: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    reviewing: "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    resolved: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    closed: "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  }[status];
}

function locationLabel(issue: AdminIssue) {
  return [issue.barangay, issue.city, issue.province].filter(Boolean).join(", ") || "N/A";
}

export function IssueManagementView() {
  const sandbox = useTutorialSandbox();
  return <IssueManagementContent key={sandbox?.state.id ?? "live"} sandbox={sandbox} />;
}

function IssueManagementContent({ sandbox }: { sandbox: TutorialSandboxContextValue | null }) {
  const [statusFilter, setStatusFilter] = useState<IssueStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteIssue, setDeleteIssue] = useState<AdminIssue | null>(null);
  const queryClient = useQueryClient();


  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data: statsData, isLoading: statsQueryLoading } = useQuery<IssueStatsResponse>({
    enabled: !sandbox,
    queryKey: ["admin-issue-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/issues/stats");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load issue statistics");
      return result;
    },
  });

  const { data: issueData, isLoading: issuesQueryLoading } = useQuery<IssueListResponse>({
    enabled: !sandbox,
    queryKey: ["admin-issues", statusFilter, page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const response = await fetch(`/api/admin/issues?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load issues");
      return result;
    },
  });

  const deleteMutation = useMutation({
    onMutate: (issueId: string) => { notifyTutorialAction({ resource: "issues", recordId: issueId, action: "delete", outcome: "pending", simulated: Boolean(sandbox) }); },
    mutationFn: (issueId: string) => runTutorialMutation({
      sandbox: Boolean(sandbox), recordId: issueId,
      simulate: () => { sandbox!.apply({ resource: "issues", recordId: issueId, action: "delete" }); return {}; },
      persist: async () => {
        const response = await fetch(`/api/admin/issues/${issueId}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to delete issue");
        return result;
      },
    }),
    onSuccess: (result, issueId) => {
      notifyTutorialAction({ resource: "issues", recordId: issueId, action: "delete", outcome: "success", simulated: result.simulated });
      setDeleteIssue(null);
      if (result.simulated) { toast.success("Tutorial deletion complete. No real report was deleted."); return; }
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-issue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["public-issues"] });
      toast.success("Issue deleted");
    },
    onError: (error: Error, issueId) => {
      notifyTutorialAction({ resource: "issues", recordId: issueId, action: "delete", outcome: "error", simulated: Boolean(sandbox) });
      toast.error(error.message);
    },
  });

  const statsLoading = !sandbox && statsQueryLoading;
  const isLoading = !sandbox && issuesQueryLoading;
  const example = sandbox?.state.issue;
  const stats = sandbox ? { total: example ? 1 : 0, pending: Number(example?.status === "pending"), reviewing: Number(example?.status === "reviewing"), resolved: Number(example?.status === "resolved"), closed: Number(example?.status === "closed") } : statsData?.data ?? { total: 0, pending: 0, reviewing: 0, resolved: 0, closed: 0 };
  const issues = sandbox ? (example ? [example] : []).filter((item) => (statusFilter === "all" || item.status === statusFilter) && `${item.issueDescription} ${item.ticketNumber} ${item.reporterName} ${item.projectName}`.toLowerCase().includes(debouncedSearch.toLowerCase())) : issueData?.data ?? [];
  const pagination = sandbox ? { page: 1, limit: ITEMS_PER_PAGE, total: issues.length, totalPages: 1 } : issueData?.pagination ?? { page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 };
  const emptyMessage = useMemo(() => {
    if (debouncedSearch) return "No E-Reports match your search.";
    if (statusFilter !== "all") return "No E-Reports have this status.";
    return "No E-Reports have been submitted yet.";
  }, [debouncedSearch, statusFilter]);

  return (
    <div className="space-y-5">
      {sandbox ? <TutorialModeNotice /> : null}
      <section data-tour="issues-summary" className="grid gap-3 md:grid-cols-4">
        <Metric label="Total E-Reports" value={stats.total} icon={<MessageSquare className="size-4" />} loading={statsLoading} />
        <Metric label="Waiting for review" value={stats.pending} icon={<Clock className="size-4" />} tone="amber" loading={statsLoading} />
        <Metric label="Being reviewed" value={stats.reviewing} icon={<AlertCircle className="size-4" />} tone="blue" loading={statsLoading} />
        <Metric label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="size-4" />} tone="green" loading={statsLoading} />
      </section>

      <section data-tour="issues-filters" className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search E-Reports by concern, location, reporter, ticket, or project"
              className="min-h-11 pl-9"
            />
          </div>

          <select
            aria-label="Issue status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as IssueStatus);
              setPage(1);
            }}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section data-tour="issues-list" className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Table scrollRegionLabel="E-Report results. Use horizontal scrolling to view all columns.">
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-950">
              <TableHead className="min-w-[420px] px-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">Issue Details</TableHead>
              <TableHead className="min-w-[210px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Location</TableHead>
              <TableHead className="min-w-[150px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Reporter</TableHead>
              <TableHead className="min-w-[140px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Status</TableHead>
              <TableHead className="min-w-[110px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Date</TableHead>
              <TableHead className="min-w-[130px] text-xs font-extrabold uppercase tracking-wide text-slate-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Loading E-Reports...
                  </div>
                </TableCell>
              </TableRow>
            ) : issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center text-sm font-bold text-slate-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <TableRow key={issue.id} data-tour="issue-row" data-tour-record-id={issue.id} className="dark:border-slate-800">
                  <TableCell className="max-w-[520px] whitespace-normal px-4 py-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {issue.category && (
                          <Badge variant="outline" className="h-auto rounded-full border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            {issue.category}
                          </Badge>
                        )}
                        <span className="text-xs font-extrabold uppercase tracking-wide text-primary">{issue.issueType}</span>
                        <span className="text-xs font-semibold text-slate-400">{issue.ticketNumber}</span>
                      </div>
                      <Link href={`/issues/${issue.id}`} className="line-clamp-2 text-sm font-extrabold leading-6 text-slate-950 hover:text-primary dark:text-white">
                        {issue.issueDescription || "No description provided"}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {issue.projectName && (
                          <p className="line-clamp-1 font-semibold">{issue.projectName}</p>
                        )}
                        {(issue.farmOperation || issue.reportedFarmOperation) && (
                          <p className="line-clamp-1 font-medium">Farm Operation: {issue.farmOperation || issue.reportedFarmOperation}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal py-4">
                    <div className="flex gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{locationLabel(issue)}</p>
                        <p className="text-xs font-semibold text-slate-500">{issue.streetLandmark || "N/A"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal py-4 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    {issue.reporterName}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={cn("h-auto rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase", statusClass(issue.status))}>
                      {getStatusLabel(issue.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{formatDate(issue.createdAt)}</TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" className="min-h-11">
                        <Link data-tour="issue-respond" href={`/issues/${issue.id}`}>
                          <MessageSquare className="size-4" />
                          Respond
                        </Link>
                      </Button>
                      <Button data-tour="issue-delete" type="button" variant="destructive" className="min-h-11" onClick={() => setDeleteIssue(issue)}>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)} · {pagination.total.toLocaleString()} E-Report{pagination.total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button className="min-h-11" type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button className="min-h-11" type="button" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={Boolean(deleteIssue)} onOpenChange={(open) => !open && setDeleteIssue(null)}>
        <AlertDialogContent data-tour="issue-delete-dialog" data-tour-record-id={deleteIssue?.id}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete E-Report?</AlertDialogTitle>
            <AlertDialogDescription>
              {sandbox ? "Tutorial: confirm to remove the example report for this session. No real report, evidence, or history will be deleted." : "This permanently removes the issue record, evidence references, and response history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-tour="issue-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-tour="issue-delete-confirm"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteIssue && deleteMutation.mutate(deleteIssue.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "slate",
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "slate" | "amber" | "blue" | "green";
  loading?: boolean;
}) {
  const toneClass = {
    slate: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", toneClass)}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">
        {loading ? "..." : value.toLocaleString()}
      </p>
    </div>
  );
}
