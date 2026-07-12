"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  Send,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaViewer } from "@/components/ui/media-viewer";
import { Textarea } from "@/components/ui/textarea";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { cn } from "@/lib/utils";

type AdminIssueStatus = "pending" | "reviewing" | "resolved" | "closed";

type IssueResponse = {
  id: string;
  message: string;
  statusChange: string | null;
  newStatus: string | null;
  internalNotes: string | null;
  isInternalOnly: boolean;
  attachmentUrls: string[];
  createdAt: string;
  responderName: string;
  responder: {
    id: string;
    name: string;
    role: string;
  };
};

type AdminIssueDetail = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  projectName: string | null;
  issueType: string;
  issueDescription: string;
  status: AdminIssueStatus;
  rawStatus: string;
  priority: string | null;
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetLandmark: string;
  reporterUserId: string | null;
  reporterName: string;
  reporterContact: string | null;
  reporterEmail: string | null;
  isAnonymous: boolean;
  photoUrls: string[];
  videoUrls: string[];
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
  dateNoticed: string;
  resolvedAt: string | null;
  responses: IssueResponse[];
  project: {
    id: string | null;
    name: string;
    code: string | null;
  } | null;
};

type IssueDetailResponse = {
  success: boolean;
  data: AdminIssueDetail;
};

const statusOptions: Array<{ value: AdminIssueStatus; label: string }> = [
  { value: "pending", label: "Pending Review" },
  { value: "reviewing", label: "Under Review" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function getStatusLabel(status: AdminIssueStatus) {
  return {
    pending: "Pending Review",
    reviewing: "Under Review",
    resolved: "Resolved",
    closed: "Closed",
  }[status];
}

function statusClass(status: AdminIssueStatus) {
  return {
    pending: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    reviewing: "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    resolved: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    closed: "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  }[status];
}

function filenameFromUrl(url: string) {
  return decodeURIComponent(url.split("?")[0]?.split("/").pop() || "attachment");
}

export function IssueDetailAdminView({ issueId }: { issueId: string }) {
  const [responseMessage, setResponseMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [status, setStatus] = useState<AdminIssueStatus | "">("");
  const [internalOnly, setInternalOnly] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<IssueDetailResponse>({
    queryKey: ["admin-issue", issueId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/issues/${issueId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load issue");
      return result;
    },
  });

  const issue = data?.data;

  const media = useMemo(() => {
    if (!issue) return [];
    return [
      ...issue.photoUrls.map((url) => ({ type: "image" as const, url })),
      ...issue.videoUrls.map((url) => ({ type: "video" as const, url })),
    ];
  }, [issue]);

  const responseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/issues/${issueId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: responseMessage.trim(),
          internalNotes: internalNotes.trim(),
          newStatus: status || undefined,
          isInternalOnly: internalOnly,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit response");
      return result;
    },
    onSuccess: () => {
      setResponseMessage("");
      setInternalNotes("");
      setStatus("");
      setInternalOnly(false);
      queryClient.invalidateQueries({ queryKey: ["admin-issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-issue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["public-issue", issueId] });
      toast.success("Issue response saved");
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const canSubmit = responseMessage.trim().length > 0 || internalNotes.trim().length > 0 || Boolean(status);

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Issues" }, { label: "Details" }]}
      title="Issue Details"
      description="View and respond to reported issue."
    >
      <div className="space-y-4">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/issues">
            <ArrowLeft className="size-4" />
            Back to Issues
          </Link>
        </Button>

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading issue details...
            </div>
          </div>
        ) : isError || !issue ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error instanceof Error ? error.message : "Issue not found"}
          </div>
        ) : (
          <>
            <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("h-auto rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase", statusClass(issue.status))}>
                        {getStatusLabel(issue.status)}
                      </Badge>
                      <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase">
                        {issue.issueType}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">{issue.ticketNumber}</span>
                    </div>
                    <h2 className="max-w-6xl text-xl font-extrabold leading-8 text-slate-950 dark:text-white">
                      {issue.issueDescription || "No description provided"}
                    </h2>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    Reported {formatDate(issue.createdAt)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[1.4fr_0.9fr]">
                <div className="space-y-4">
                  <InfoCard title="Reporter Information" icon={<User className="size-4" />}>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InfoItem label="Name" value={issue.reporterName} icon={<User className="size-4" />} />
                      <InfoItem label="Email" value={issue.reporterEmail || (issue.isAnonymous ? "Hidden from public view" : "N/A")} icon={<Mail className="size-4" />} />
                      <InfoItem label="Contact" value={issue.reporterContact || (issue.isAnonymous ? "Hidden from public view" : "N/A")} icon={<Phone className="size-4" />} />
                    </div>
                    {issue.isAnonymous && (
                      <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-300">
                        Anonymous report. Reporter details are hidden from public view.
                      </div>
                    )}
                  </InfoCard>

                  <InfoCard title={`Evidence Media (${media.length + issue.documentUrls.length})`} icon={<FileText className="size-4" />}>
                    {media.length === 0 && issue.documentUrls.length === 0 ? (
                      <p className="text-sm font-semibold text-slate-500">No evidence attached.</p>
                    ) : (
                      <div className="space-y-4">
                        {media.length > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {media.map((item, index) => {
                              const src = getFullUrl(item.url);
                              return (
                                <button
                                  type="button"
                                  key={`${item.url}-${index}`}
                                  className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left dark:border-slate-700 dark:bg-slate-950"
                                  onClick={() => setViewingMedia(index)}
                                >
                                  {item.type === "image" ? (
                                    <Image
                                      src={src || "/placeholder-image.jpg"}
                                      alt={`Evidence ${index + 1}`}
                                      fill
                                      sizes="(max-width: 768px) 100vw, 33vw"
                                      className="object-cover transition-transform group-hover:scale-105"
                                      unoptimized={isLocalMinIO(src)}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
                                      <Play className="size-8" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {issue.documentUrls.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {issue.documentUrls.map((url) => (
                              <a
                                key={url}
                                href={getFullUrl(url) || url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200"
                              >
                                <FileText className="size-4 text-primary" />
                                <span className="truncate">{filenameFromUrl(url)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </InfoCard>

                  <InfoCard title={`Responses (${issue.responses.length})`} icon={<MessageSquare className="size-4" />}>
                    {issue.responses.length === 0 ? (
                      <p className="text-sm font-semibold text-slate-500">No official responses yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {issue.responses.map((response) => (
                          <div key={response.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                                  {response.responderName}
                                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                                    {response.responder.role}
                                  </span>
                                  {response.isInternalOnly && (
                                    <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">
                                      Internal
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs font-semibold text-slate-500">{formatDate(response.createdAt, true)}</p>
                              </div>
                              {response.statusChange && (
                                <Badge variant="outline" className="rounded-full text-xs font-bold">
                                  {response.statusChange}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{response.message}</p>
                            {response.internalNotes && (
                              <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
                                {response.internalNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </InfoCard>
                </div>

                <aside className="space-y-4">
                  <InfoCard title="Project & Location" icon={<MapPin className="size-4" />}>
                    <div className="space-y-4">
                      <InfoItem label="Project" value={issue.projectName || "Unlinked Infrastructure Report"} icon={<Building2 className="size-4" />} />
                      <InfoItem label="Location" value={[issue.barangay, issue.city, issue.province].filter(Boolean).join(", ") || "N/A"} icon={<MapPin className="size-4" />} />
                      <InfoItem label="Landmark" value={issue.streetLandmark || "N/A"} icon={<MapPin className="size-4" />} />
                      <InfoItem label="Last Updated" value={formatDate(issue.updatedAt)} icon={<CalendarDays className="size-4" />} />
                    </div>
                  </InfoCard>

                  <InfoCard title="Respond" icon={<Send className="size-4" />}>
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!canSubmit) {
                          toast.error("Add a response, internal note, or status change first.");
                          return;
                        }
                        responseMutation.mutate();
                      }}
                    >
                      <div className="space-y-2">
                        <label htmlFor="issue-status" className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                          Update Status
                        </label>
                        <select
                          id="issue-status"
                          value={status}
                          onChange={(event) => setStatus(event.target.value as AdminIssueStatus | "")}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">Keep current status</option>
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="response-message" className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                          Official Response
                        </label>
                        <Textarea
                          id="response-message"
                          value={responseMessage}
                          onChange={(event) => setResponseMessage(event.target.value)}
                          placeholder="Write the response visible to citizens..."
                          rows={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="internal-notes" className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                          Internal Notes
                        </label>
                        <Textarea
                          id="internal-notes"
                          value={internalNotes}
                          onChange={(event) => setInternalNotes(event.target.value)}
                          placeholder="Optional notes for admins only..."
                          rows={3}
                        />
                      </div>

                      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        <Checkbox checked={internalOnly} onCheckedChange={(checked) => setInternalOnly(Boolean(checked))} />
                        <span>
                          Internal only
                          <span className="block text-xs font-medium text-slate-500">Hide this response from the public issue details page.</span>
                        </span>
                      </label>

                      <Button type="submit" className="w-full" disabled={responseMutation.isPending || !canSubmit}>
                        {responseMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Submit Response
                      </Button>
                    </form>
                  </InfoCard>

                  <InfoCard title="Timeline" icon={<Clock className="size-4" />}>
                    <div className="space-y-3 text-sm">
                      <TimelineItem label="Reported" value={formatDate(issue.createdAt, true)} />
                      <TimelineItem label="Last Updated" value={formatDate(issue.updatedAt, true)} />
                      {issue.resolvedAt && <TimelineItem label="Resolved" value={formatDate(issue.resolvedAt, true)} icon={<CheckCircle2 className="size-4" />} />}
                    </div>
                  </InfoCard>
                </aside>
              </div>
            </section>

            <MediaViewer media={media} initialIndex={viewingMedia ?? 0} open={viewingMedia !== null} onClose={() => setViewingMedia(null)} />
          </>
        )}
      </div>
    </AdminPageWrapper>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold text-slate-950 dark:text-white">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="break-words text-sm font-extrabold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon ?? <CalendarDays className="size-4" />}
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
