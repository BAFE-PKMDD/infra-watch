"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileImage,
  MapPin,
  MessageSquare,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

type IssueStatus = "pending" | "reviewing" | "resolved" | "closed";

type IssueResponse = {
  id: string;
  responderName: string;
  message: string;
  createdAt: string;
};

type IssueDetails = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  projectName: string;
  project?: { id: string | null; name: string; code: string | null } | null;
  issueType: string;
  issueDescription: string;
  status: string;
  fmrStatus?: IssueStatus;
  region: string;
  province: string;
  city: string;
  barangay: string;
  date?: string;
  dateNoticed?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  comments?: IssueResponse[];
  responses?: IssueResponse[];
};

const statusConfig: Record<IssueStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending Review", color: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock },
  reviewing: { label: "Under Review", color: "border-blue-200 bg-blue-50 text-blue-700", icon: AlertCircle },
  resolved: { label: "Resolved", color: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  closed: { label: "Closed", color: "border-slate-200 bg-slate-50 text-slate-700", icon: XCircle },
};

async function fetchIssue(id: string) {
  const response = await fetch(`/api/issues/${encodeURIComponent(id)}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Issue not found");
  return data.data as IssueDetails;
}

function normalizeStatus(issue: IssueDetails): IssueStatus {
  if (issue.fmrStatus) return issue.fmrStatus;
  if (issue.status === "resolved") return "resolved";
  if (issue.status === "in-progress" || issue.status === "reviewing") return "reviewing";
  if (issue.status === "suspended" || issue.status === "closed") return "closed";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });
}

export default function IssueDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: issue, isLoading, isError } = useQuery({
    queryKey: ["issue", id],
    queryFn: () => fetchIssue(id),
  });

  const status = issue ? normalizeStatus(issue) : "pending";
  const StatusIcon = statusConfig[status].icon;
  const responses = useMemo(() => issue?.responses || issue?.comments || [], [issue]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-4 py-24 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-900" />
              <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-900" />
              <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-900" />
            </div>
            <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <div className="min-h-screen bg-white px-4 py-24 text-center dark:bg-slate-950">
        <AlertCircle className="mx-auto mb-4 size-16 text-red-500" />
        <h2 className="mb-2 text-2xl font-bold text-slate-950 dark:text-white">Issue Not Found</h2>
        <p className="mb-6 text-slate-500 dark:text-slate-400">The issue you are looking for does not exist or has been removed.</p>
        <Button asChild>
          <Link href="/report-issue"><ArrowLeft className="mr-2 size-4" /> Back to Reported Issues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-slate-950 sm:px-6 lg:px-8 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">

      <div className="mx-auto max-w-6xl">
        <Link href="/report-issue" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="size-4" /> Back to Reported Issues
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <main className="space-y-5">
            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[status].color}`}>
                  <StatusIcon className="size-3.5" />
                  {statusConfig[status].label}
                </Badge>
                <Badge className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">
                  <TriangleAlert className="size-3.5" />
                  Issue: {issue.issueType}
                </Badge>
              </div>
              <h1 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">Issue Description</h1>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{issue.issueDescription}</p>
            </Card>

            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                <MapPin className="size-4 text-emerald-400" /> Location
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <DetailCell label="Region" value={issue.region || "N/A"} />
                <DetailCell label="Province" value={issue.province || "N/A"} />
                <DetailCell label="City / Municipality" value={issue.city || "N/A"} />
                <DetailCell label="Barangay" value={issue.barangay || "N/A"} />
              </div>
            </Card>

            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                <FileImage className="size-4 text-emerald-400" /> Evidence privacy
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Submitted evidence is retained for authorized review and is not published until an explicit evidence-publication workflow is available.
              </p>
            </Card>

            {issue.project && (
              <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-1 text-xs font-semibold text-slate-500">Related Project</p>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">{issue.project.name} {issue.project.code ? `(${issue.project.code})` : ""}</h2>
                  {issue.project.id && (
                    <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                      <Link href={`/projects/${issue.project.id}`}>
                        <ExternalLink className="mr-2 size-3.5" /> View Project
                      </Link>
                    </Button>
                  )}
                </div>
              </Card>
            )}

            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                <MessageSquare className="size-4 text-emerald-400" /> Official Responses
              </h2>
              {responses.length > 0 ? (
                <div className="space-y-6">
                  {responses.map((response) => (
                    <div key={response.id} className="relative border-l border-slate-200 pl-6 dark:border-slate-700">
                      <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-emerald-500" />
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-950 dark:text-white">{response.responderName}</p>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-950 dark:text-slate-400">{formatDate(response.createdAt)}</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">{response.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">No official responses yet.</div>
              )}
            </Card>
          </main>

          <aside className="space-y-5">
            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                <Calendar className="size-4 text-emerald-400" /> Timeline
              </h2>
              <div className="space-y-4">
                <TimelineRow label="Date Noticed" value={formatDate(issue.dateNoticed || issue.date || issue.createdAt)} />
                <TimelineRow label="Reported On" value={formatDate(issue.createdAt)} />
                <TimelineRow label="Last Updated" value={formatDate(issue.updatedAt)} />
                {issue.resolvedAt && <TimelineRow label="Resolved On" value={formatDate(issue.resolvedAt)} />}
              </div>
            </Card>

            <Card className="rounded-xl border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
                <AlertCircle className="size-4 text-emerald-500" /> Reporter privacy
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Reporter identity and contact details are protected and are never included in the public issue record.
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
