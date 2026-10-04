"use client";

import { notifyTutorialAction } from "@/lib/tours/events";
import { isTutorialRecord, runTutorialMutation, TUTORIAL_ISSUE_ID } from "@/lib/tours/sandbox";
import { TutorialModeNotice, useTutorialSandbox, type TutorialSandboxContextValue } from "@/components/admin/tour/tutorial-sandbox";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ImageOff,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import {
  buildIssueReviewPayload,
  canSaveIssueReviewAction,
  createIssueReviewDraft,
  getIssueReviewActionLabel,
  getIssueReviewSuccessMessage,
  ISSUE_REVIEW_ACTIONS,
  type AdminIssueStatus,
  type IssueReviewActionMode,
} from "@/components/admin/issues/issue-review-action";
import { EvidenceLocationMap } from "@/components/shared/evidence-location-map";
import { GeoVideoPlayer } from "@/components/shared/geo-video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaViewer } from "@/components/ui/media-viewer";
import { Textarea } from "@/components/ui/textarea";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import { cn } from "@/lib/utils";
import type { GeoTrackPoint, StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

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

export type AdminIssueDetail = {
  id: string;
  ticketNumber: string;
  projectId: string | null;
  projectName: string | null;
  category?: string | null;
  reportedFarmOperation?: string | null;
  farmOperation?: string | null;
  issueType: string;
  issueDescription: string;
  publicDescription: string | null;
  publicApprovedAt: string | null;
  publicApprovedBy: string | null;
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
  evidence: StoredIssueEvidenceItem[];
  geoVideoTrack: GeoTrackPoint[] | null;
  geoVideoUrl: string | null;
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
  { value: "pending", label: "Pending review" },
  { value: "reviewing", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];


function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function getStatusLabel(status: AdminIssueStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function statusClass(status: AdminIssueStatus) {
  return {
    pending: "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    reviewing: "border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    resolved: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    closed: "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  }[status];
}

function formatStatusChange(statusChange: string) {
  const [from, to] = statusChange.split(" -> ");
  if (!from || !to) return "Status changed";
  return `${getStatusLabel(from as AdminIssueStatus)} to ${getStatusLabel(to as AdminIssueStatus)}`;
}

function filenameFromUrl(url: string) {
  return decodeURIComponent(url.split("?")[0]?.split("/").pop() || "attachment");
}

function locationLabel(issue: AdminIssueDetail) {
  return [issue.barangay, issue.city, issue.province].filter(Boolean).join(", ") || "Location not provided";
}

export function IssueDetailAdminView({ issueId }: { issueId: string }) {
  const sandbox = useTutorialSandbox();
  if (!sandbox && isTutorialRecord(issueId)) return <AdminPageWrapper title="Tutorial ended" description="The example report has been cleared."><Link className="inline-flex min-h-11 items-center text-primary underline" href="/issues">Return to E-Reports</Link></AdminPageWrapper>;
  return <IssueDetailContent key={sandbox?.state.id ?? issueId} issueId={sandbox ? TUTORIAL_ISSUE_ID : issueId} sandbox={sandbox} />;
}

function IssueDetailContent({ issueId, sandbox }: { issueId: string; sandbox: TutorialSandboxContextValue | null }) {
  const [draft, setDraft] = useState(() => createIssueReviewDraft("reply"));
  const [viewingMedia, setViewingMedia] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading: queryLoading, isError: queryError, error } = useQuery<IssueDetailResponse>({
    enabled: !sandbox && !isTutorialRecord(issueId),
    queryKey: ["admin-issue", issueId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/issues/${issueId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load issue");
      return result;
    },
  });

  const issue = sandbox ? sandbox.state.issue : data?.data;
  const isLoading = !sandbox && queryLoading;
  const isError = !sandbox && queryError;

  const media = useMemo<Array<StoredIssueEvidenceItem & { type: "image" | "video"; evidenceIndex: number }>>(() => {
    if (!issue) return [];
    const storedMedia: Array<StoredIssueEvidenceItem & { type: "image" | "video"; evidenceIndex: number }> = [];
    if (Array.isArray(issue.evidence)) {
      issue.evidence.forEach((item, evidenceIndex) => {
        if (item.type === "image" || item.type === "video") {
          storedMedia.push({ ...item, type: item.type, evidenceIndex });
        }
      });
    }
    if (storedMedia.length > 0) return storedMedia;

    return [
      ...issue.photoUrls.map((url, evidenceIndex) => ({ type: "image" as const, url, evidenceIndex })),
      ...issue.videoUrls.map((url, index) => ({
        type: "video" as const,
        url,
        evidenceIndex: issue.photoUrls.length + index,
      })),
    ];
  }, [issue]);

  const canSubmit = canSaveIssueReviewAction(draft);
  const selectedAction = ISSUE_REVIEW_ACTIONS[draft.mode];

  const responseMutation = useMutation({
    onMutate: (submission) => { notifyTutorialAction({ resource: "issues", recordId: submission.issueId, action: submission.mode, outcome: "pending", simulated: Boolean(sandbox) }); },
    mutationFn: (submission: {
      issueId: string;
      mode: IssueReviewActionMode;
      payload: ReturnType<typeof buildIssueReviewPayload>;
    }) => runTutorialMutation({
      sandbox: Boolean(sandbox), recordId: submission.issueId,
      simulate: () => { sandbox!.apply({ resource: "issues", recordId: submission.issueId, action: submission.mode, payload: submission.payload }); return {}; },
      persist: async () => {
        const response = await fetch(`/api/admin/issues/${submission.issueId}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission.payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to save case update");
        return result;
      },
    }),
    onSuccess: (result, submission) => {
      notifyTutorialAction({ resource: "issues", recordId: submission.issueId, action: submission.mode, outcome: "success", simulated: result.simulated });
      setDraft((current) => current.mode === submission.mode ? createIssueReviewDraft(current.mode) : current);
      if (result.simulated) { toast.success("Tutorial update complete. Nothing was sent or saved to real records."); return; }
      queryClient.invalidateQueries({ queryKey: ["admin-issue", submission.issueId] });
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-issue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["public-issue", submission.issueId] });
      toast.success(getIssueReviewSuccessMessage(submission.mode));
    },
    onError: (mutationError: Error, submission) => {
      notifyTutorialAction({ resource: "issues", recordId: submission.issueId, action: submission.mode, outcome: "error", simulated: Boolean(sandbox) });
      toast.error(mutationError.message);
    },
  });

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "E-Report" }, { label: "Review" }]}
      title="Review E-Report"
      description="Understand the report, check its evidence, then record one clear next step."
    >
      <div className="space-y-4">
        {sandbox ? <TutorialModeNotice /> : null}
        <Button asChild variant="ghost" className="min-h-11 w-fit px-3">
          <Link href="/issues">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to E-Reports
          </Link>
        </Button>

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Loading the report...
            </div>
          </div>
        ) : isError || !issue ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error instanceof Error ? error.message : "This report could not be found."}
          </div>
        ) : (
          <>
            <article data-tour="issue-detail" data-tour-record-id={issueId} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <header className="border-b border-slate-200 px-4 py-5 sm:px-6 dark:border-slate-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("h-auto rounded-full px-2.5 py-1 text-xs font-bold", statusClass(issue.status))}>
                        {getStatusLabel(issue.status)}
                      </Badge>
                      {issue.category && (
                        <Badge variant="outline" className="h-auto rounded-full border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {issue.category}
                        </Badge>
                      )}
                      <Badge variant="outline" className="h-auto rounded-full px-2.5 py-1 text-xs font-bold">
                        {issue.issueType}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{issue.ticketNumber}</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-950 sm:text-xl dark:text-white">Report and evidence</h2>
                      <p className="mt-2 max-w-4xl whitespace-pre-wrap text-base leading-7 text-slate-800 dark:text-slate-100">
                        {issue.issueDescription || "No description was provided."}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Reported {formatDate(issue.createdAt)}
                  </p>
                </div>

                <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
                  <QuickFact label="Project" value={issue.projectName || "Not linked to a project"} icon={<Building2 className="size-4" />} />
                  <QuickFact label="Farm operation" value={issue.farmOperation || issue.reportedFarmOperation || "Not specified"} icon={<Building2 className="size-4" />} />
                  <QuickFact label="General location" value={locationLabel(issue)} icon={<MapPin className="size-4" />} />
                  <QuickFact label="Last updated" value={formatDate(issue.updatedAt, true)} icon={<Clock className="size-4" />} />
                </dl>
              </header>

              <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:items-start">
                <aside className="order-1 xl:order-2 xl:sticky xl:top-6">
                  <section aria-labelledby="next-step-heading" className="rounded-lg border border-primary/30 bg-slate-50 p-4 sm:p-5 dark:bg-slate-950">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Send className="size-4" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 id="next-step-heading" className="text-lg font-bold text-slate-950 dark:text-white">Choose the next step</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Complete one action at a time. Only the fields needed for that action will appear.</p>
                      </div>
                    </div>

                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!canSubmit) {
                          toast.error("Complete the required fields before saving.");
                          return;
                        }
                        responseMutation.mutate({
                          issueId,
                          mode: draft.mode,
                          payload: buildIssueReviewPayload(draft),
                        });
                      }}
                    >
                      <fieldset disabled={responseMutation.isPending} className="space-y-4">
                      <label htmlFor="review-action" className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        What do you need to do?
                        <select
                          id="review-action"
                          value={draft.mode}
                          onChange={(event) => setDraft(createIssueReviewDraft(event.target.value as IssueReviewActionMode))}
                          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          {Object.entries(ISSUE_REVIEW_ACTIONS).map(([value, option]) => (
                            <option key={value} value={value} disabled={Boolean(sandbox) && value !== "reply"}>{option.label}</option>
                          ))}
                        </select>
                        <span className="text-sm font-normal leading-5 text-slate-600 dark:text-slate-300">{selectedAction.description}</span>
                      </label>

                      {draft.mode === "reply" && (
                        <label htmlFor="response-message" className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Reply to the citizen
                          <Textarea
                            id="response-message"
                            value={draft.responseMessage}
                            onChange={(event) => setDraft((current) => ({ ...current, responseMessage: event.target.value }))}
                            placeholder="Write a clear update for the reporter..."
                            rows={5}
                            required
                          />
                          <span className="text-sm font-normal leading-5 text-slate-600 dark:text-slate-300">The reporter can read this message. Do not include staff-only notes.</span>
                        </label>
                      )}

                      {draft.mode === "note" && (
                        <label htmlFor="staff-note" className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Staff note
                          <Textarea
                            id="staff-note"
                            value={draft.internalNotes}
                            onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))}
                            placeholder="Record what staff need to know..."
                            rows={4}
                            required
                          />
                          <span className="inline-flex items-center gap-1.5 text-sm font-normal leading-5 text-slate-600 dark:text-slate-300"><ShieldCheck className="size-4" aria-hidden="true" />Authorized staff only. This note is not shown to the citizen.</span>
                        </label>
                      )}

                      {draft.mode === "status" && (
                        <>
                          <label htmlFor="issue-status" className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            New case status
                            <select
                              id="issue-status"
                              value={draft.status}
                              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as AdminIssueStatus | "" }))}
                              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                              required
                            >
                              <option value="">Select a new status</option>
                              {statusOptions.filter((option) => option.value !== issue.status).map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label htmlFor="status-note" className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Reason for the change
                            <Textarea
                              id="status-note"
                              value={draft.internalNotes}
                              onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))}
                              placeholder="Briefly explain why the status is changing..."
                              rows={3}
                              required
                            />
                            <span className="text-sm font-normal leading-5 text-slate-600 dark:text-slate-300">Saved as a staff-only case note.</span>
                          </label>
                        </>
                      )}

                      {draft.mode === "publish" && (
                        <label htmlFor="public-description" className="grid gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Privacy-reviewed public summary
                          <Textarea
                            id="public-description"
                            value={draft.publicDescription}
                            onChange={(event) => setDraft((current) => ({ ...current, publicDescription: event.target.value }))}
                            placeholder="Summarize the concern without names, contact details, exact addresses, or sensitive facts..."
                            minLength={20}
                            maxLength={2000}
                            rows={5}
                            required
                          />
                          <span className="text-sm font-normal leading-5 text-slate-600 dark:text-slate-300">Only the reviewed summary will be public. The original report, exact location, reporter details, and evidence stay private.</span>
                          {issue.publicApprovedAt && (
                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">A summary was published on {formatDate(issue.publicApprovedAt, true)}. Saving replaces it.</span>
                          )}
                        </label>
                      )}

                      <Button data-tour="issue-save" type="submit" className="min-h-11 w-full" disabled={responseMutation.isPending || !canSubmit}>
                        {responseMutation.isPending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                        {responseMutation.isPending ? "Saving..." : getIssueReviewActionLabel(draft.mode)}
                      </Button>
                      </fieldset>
                    </form>
                  </section>
                </aside>

                <div className="order-2 min-w-0 space-y-4 xl:order-1">
                  <section aria-labelledby="evidence-heading" className="rounded-lg border border-slate-200 p-4 sm:p-5 dark:border-slate-800">
                    <div className="mb-4">
                      <h3 id="evidence-heading" className="text-lg font-bold text-slate-950 dark:text-white">Evidence</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Open an attachment to check what the reporter submitted.</p>
                    </div>

                    {media.length === 0 && issue.documentUrls.length === 0 ? (
                      <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">No evidence was attached to this report.</p>
                    ) : (
                      <div className="space-y-4">
                        {media.length > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {media.map((item, index) => {
                              const src = getFullUrl(item.url);
                              return (
                                <button
                                  type="button"
                                  key={`${item.url}-${index}`}
                                  id={`evidence-${item.evidenceIndex}`}
                                  aria-label={`Open evidence ${index + 1}`}
                                  className="group relative min-h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-slate-950"
                                  onClick={() => setViewingMedia(index)}
                                >
                                  {item.type === "image" && src ? (
                                    <Image
                                      src={src}
                                      alt={`Evidence ${index + 1}`}
                                      fill
                                      sizes="(max-width: 768px) 100vw, 33vw"
                                      className="object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none"
                                      unoptimized={isLocalMinIO(src)}
                                    />
                                  ) : item.type === "image" ? (
                                    <div className="flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                      <ImageOff className="size-6" aria-hidden="true" />
                                      Preview unavailable
                                    </div>
                                  ) : (
                                    <div className="flex h-full min-h-44 w-full items-center justify-center bg-slate-950 text-white">
                                      <Play className="size-8" aria-hidden="true" />
                                    </div>
                                  )}
                                  {typeof item.lat === "number" && typeof item.lon === "number" ? (
                                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-slate-950/85 px-2 py-1 text-xs font-semibold text-white">
                                      <MapPin className="size-3 text-emerald-300" aria-hidden="true" />
                                      Location attached
                                    </span>
                                  ) : null}
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
                                className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:text-slate-200"
                              >
                                <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                <span className="truncate">{filenameFromUrl(url)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <Disclosure title="Reporter and case details" summary="Reporter, location, and dates" icon={<User className="size-4" />}>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <InfoItem label="Category" value={issue.category || "Not provided"} icon={<FileText className="size-4" />} />
                      <InfoItem label="Farm operation" value={issue.farmOperation || issue.reportedFarmOperation || "Not specified"} icon={<Building2 className="size-4" />} />
                      <InfoItem label="Reporter" value={issue.reporterName || "Not provided"} icon={<User className="size-4" />} />
                      <InfoItem label="Email" value={issue.reporterEmail || "Not provided"} icon={<Mail className="size-4" />} />
                      <InfoItem label="Contact" value={issue.reporterContact || "Not provided"} icon={<Phone className="size-4" />} />
                      <InfoItem label="Project" value={issue.projectName || "Not linked to a project"} icon={<Building2 className="size-4" />} />
                      <InfoItem label="Location" value={locationLabel(issue)} icon={<MapPin className="size-4" />} />
                      <InfoItem label="Landmark" value={issue.streetLandmark || "Not provided"} icon={<MapPin className="size-4" />} />
                    </div>
                    {issue.isAnonymous && (
                      <p className="mt-5 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Submitted anonymously. Reporter information must remain private.</p>
                    )}
                    <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3 dark:border-slate-800">
                      <TimelineItem label="Reported" value={formatDate(issue.createdAt, true)} />
                      <TimelineItem label="Last updated" value={formatDate(issue.updatedAt, true)} />
                      {issue.resolvedAt ? <TimelineItem label="Resolved" value={formatDate(issue.resolvedAt, true)} icon={<CheckCircle2 className="size-4" />} /> : <TimelineItem label="Current status" value={getStatusLabel(issue.status)} icon={<Clock className="size-4" />} />}
                    </div>
                  </Disclosure>

                  <details
                    className="group rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    onToggle={(event) => setMapOpen(event.currentTarget.open)}
                  >
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-4" aria-hidden="true" /></span>
                        <span className="font-semibold text-slate-950 dark:text-white">Evidence map and location trail</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="hidden sm:inline">Open map</span>
                        <ChevronRight className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
                      </span>
                    </summary>
                    {mapOpen && (
                      <div className="space-y-4 border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">
                        <EvidenceLocationMap evidence={issue.evidence} geoVideoTrack={issue.geoVideoTrack} geoVideoUrl={issue.geoVideoUrl} />
                        {issue.geoVideoTrack?.length && issue.geoVideoUrl ? <GeoVideoPlayer url={issue.geoVideoUrl} track={issue.geoVideoTrack} name="Reported GeoVideo" /> : null}
                        {!issue.evidence.some((item) => typeof item.lat === "number" && typeof item.lon === "number") && !issue.geoVideoTrack?.length ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300">No source-backed evidence locations are available for this report.</p>
                        ) : null}
                      </div>
                    )}
                  </details>

                  <div data-tour="issue-history"><Disclosure title={`Previous updates (${issue.responses.length})`} summary={issue.responses.length === 0 ? "No updates saved" : "Open case history"} icon={<MessageSquare className="size-4" />}>
                    {issue.responses.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300">No replies, staff notes, or status updates have been recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {issue.responses.map((response) => {
                          const duplicatedPrivateNote = response.isInternalOnly && response.internalNotes?.trim() === response.message.trim();
                          return (
                            <article key={response.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{response.responderName} <span className="font-normal text-slate-600 dark:text-slate-300">({response.responder.role})</span></p>
                                  <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{formatDate(response.createdAt, true)}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {response.isInternalOnly && <Badge variant="outline" className="rounded-full text-xs font-semibold">Staff only</Badge>}
                                  {response.statusChange && <Badge variant="outline" className="rounded-full text-xs font-semibold">{formatStatusChange(response.statusChange)}</Badge>}
                                </div>
                              </div>
                              {!duplicatedPrivateNote && response.message ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{response.message}</p> : null}
                              {response.internalNotes && (
                                <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                                  <span className="font-semibold">Staff note:</span> {response.internalNotes}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </Disclosure></div>
                </div>
              </div>
            </article>

            <MediaViewer media={media} initialIndex={viewingMedia ?? 0} open={viewingMedia !== null} onClose={() => setViewingMedia(null)} />
          </>
        )}
      </div>
    </AdminPageWrapper>
  );
}

function QuickFact({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-950 dark:text-white">{value}</dd>
      </div>
    </div>
  );
}

function Disclosure({ title, summary, icon, children }: { title: string; summary: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
          <span className="font-semibold text-slate-950 dark:text-white">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="hidden sm:inline">{summary}</span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">{children}</div>
    </details>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon ?? <CalendarDays className="size-4" />}</span>
      <div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
