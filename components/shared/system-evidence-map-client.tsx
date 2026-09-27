"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Layers3,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  Search,
  SlidersHorizontal,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getFullUrl } from "@/lib/minio-url";
import {
  getStatusDotClass,
  shortenReferenceId,
  translateCategoryLabel,
  translateEvidenceDescription,
  translateEvidenceLocation,
  translateStatusLabel,
  useClipboardCopy,
} from "@/components/shared/system-evidence-map-format";
import {
  getSystemEvidenceLocationLabel,
  parseSystemEvidenceResponse,
  type SystemEvidenceIssue,
  type SystemEvidenceMediaType,
} from "@/components/shared/system-evidence-map-types";
import { useTranslation } from "@/i18n";

type Translate = (path: string, variables?: Record<string, string | number>) => string;

function CanvasLoading() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-[28rem] w-full items-center justify-center bg-muted">
      <div className="rounded-lg border border-border bg-card px-5 py-4 text-center shadow-sm">
        <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{t("community.evidenceMap.preparing")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("community.evidenceMap.loadingCanvas")}</p>
      </div>
    </div>
  );
}

const SystemEvidenceMapCanvas = dynamic(
  () => import("@/components/shared/system-evidence-map-canvas"),
  {
    ssr: false,
    loading: () => <CanvasLoading />,
  },
);

type MediaFilter = "all" | SystemEvidenceMediaType;

// Thrown when /api/evidence fails without its own error text, so the UI can show it translated.
const EVIDENCE_LOAD_FAILED = "Unable to load geotagged evidence.";

async function fetchSystemEvidence() {
  const response = await fetch("/api/evidence", {
    headers: { Accept: "application/json" },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(typeof error === "string" ? error : EVIDENCE_LOAD_FAILED);
  }

  return parseSystemEvidenceResponse(payload);
}

function formatDate(value: string | null, t: Translate) {
  if (!value) return t("community.common.dateUnavailable");
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label htmlFor={id} className="space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function EvidenceThumb({ issue }: { issue: SystemEvidenceIssue }) {
  const [hasError, setHasError] = useState(false);
  const firstImage = issue.evidence.find((item) => item.type === "image");
  const hasVideo = issue.evidence.some((item) => item.type === "video");
  const thumbUrl = firstImage ? getFullUrl(firstImage.url) : null;

  if (thumbUrl && !hasError) {
    return (
      // Report evidence is served from MinIO/object storage and can be displayed directly.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbUrl}
        alt=""
        onError={() => setHasError(true)}
        className="size-14 shrink-0 rounded-md object-cover"
      />
    );
  }

  const Icon = hasVideo ? Video : issue.geoVideoTrack.length > 0 ? Route : Camera;
  return (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="size-5" />
    </div>
  );
}

function ReferenceIdBadge({ ticketNumber }: { ticketNumber: string }) {
  const shortId = shortenReferenceId(ticketNumber);
  const [copied, handleCopy] = useClipboardCopy(ticketNumber);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={handleCopy}
            className="-mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        }
      >
        <span className="truncate">#{shortId}</span>
        {copied ? <Check className="size-3 shrink-0 text-emerald-600" /> : <Copy className="size-3 shrink-0 opacity-60" />}
      </TooltipTrigger>
      <TooltipContent>#{ticketNumber}</TooltipContent>
    </Tooltip>
  );
}

function ResultCard({
  issue,
  selected,
  onSelect,
  cardRef,
}: {
  issue: SystemEvidenceIssue;
  selected: boolean;
  onSelect: () => void;
  cardRef: (element: HTMLElement | null) => void;
}) {
  const { t } = useTranslation();
  const imageCount = issue.evidence.filter((item) => item.type === "image").length;
  const videoCount = issue.evidence.filter((item) => item.type === "video").length;

  return (
    <article
      ref={cardRef}
      className={cn(
        "relative border-l-[3px] border-transparent px-3 py-3 transition-colors [content-visibility:auto] [contain-intrinsic-size:0_96px]",
        selected ? "border-l-primary bg-primary/5" : "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <EvidenceThumb issue={issue} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-5 break-words text-foreground [overflow-wrap:anywhere]">{translateEvidenceDescription(issue.description, t)}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {translateEvidenceLocation(issue, t)} · {formatDate(issue.createdAt, t)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 shrink-0 rounded-full", getStatusDotClass(issue.status))} />
              {translateStatusLabel(issue.status, t)}
            </span>
            {imageCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Camera className="size-3" /> {imageCount}
              </span>
            )}
            {(videoCount > 0 || issue.geoVideoTrack.length > 0) && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Video className="size-3" /> {videoCount || 1}
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="mt-2 flex items-center justify-between pl-[4.25rem]">
        <ReferenceIdBadge ticketNumber={issue.ticketNumber} />
        <Link
          href={issue.detailUrl}
          className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {issue.sourceType === "feedback" ? t("community.evidenceMap.viewFeedback") : t("community.evidenceMap.viewReport")}
        </Link>
      </div>
    </article>
  );
}

export function SystemEvidenceMapClient() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [media, setMedia] = useState<MediaFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const { data: issues = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["system-evidence-map"],
    queryFn: fetchSystemEvidence,
    staleTime: 60_000,
  });

  const categories = useMemo(
    () => [...new Set(issues.map((issue) => issue.category))].sort((a, b) => a.localeCompare(b)),
    [issues],
  );
  const statuses = useMemo(
    () => [...new Set(issues.map((issue) => issue.status))].sort((a, b) => a.localeCompare(b)),
    [issues],
  );

  const filteredIssues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return issues.flatMap((issue) => {
      const location = getSystemEvidenceLocationLabel(issue);
      const day = issue.createdAt?.slice(0, 10) ?? "";
      const matchesSearch = !normalizedSearch || [
        issue.ticketNumber,
        issue.description,
        issue.category,
        location,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return [];
      if (category !== "all" && issue.category !== category) return [];
      if (status !== "all" && issue.status !== status) return [];
      if (dateFrom && (!day || day < dateFrom)) return [];
      if (dateTo && (!day || day > dateTo)) return [];

      const evidence = media === "all"
        ? issue.evidence
        : issue.evidence.filter((item) => item.type === media);
      const geoVideoTrack = media === "image" ? [] : issue.geoVideoTrack;
      if (evidence.length === 0 && geoVideoTrack.length === 0) return [];

      return [{ ...issue, evidence, geoVideoTrack }];
    });
  }, [category, dateFrom, dateTo, issues, media, search, status]);

  const visibleSelectedIssueId = selectedIssueId && filteredIssues.some((issue) => issue.issueId === selectedIssueId)
    ? selectedIssueId
    : null;

  useEffect(() => {
    if (!visibleSelectedIssueId) return;
    const frame = window.requestAnimationFrame(() => {
      cardRefs.current.get(visibleSelectedIssueId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visibleSelectedIssueId]);

  const evidenceCount = filteredIssues.reduce((total, issue) => total + issue.evidence.length, 0);
  const routeCount = filteredIssues.filter((issue) => issue.geoVideoTrack.length > 1).length;
  const popoverFilterCount = (media !== "all" ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const activeFilterCount = [search, category !== "all", status !== "all", media !== "all", dateFrom, dateTo].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setMedia("all");
    setDateFrom("");
    setDateTo("");
    setSelectedIssueId(null);
  };

  const clearMediaAndDateFilters = () => {
    setMedia("all");
    setDateFrom("");
    setDateTo("");
  };

  const selectIssue = (issueId: string, revealMap = false) => {
    setSelectedIssueId(issueId);
    if (revealMap) setMobilePanelOpen(false);
  };

  return (
    <section className="relative isolate h-[calc(100dvh-5rem)] min-h-[42rem] overflow-hidden bg-muted text-foreground">
      <div
        className={cn(
          "grid h-full transition-[grid-template-columns] duration-200",
          sidebarCollapsed ? "lg:grid-cols-[0rem_minmax(0,1fr)]" : "lg:grid-cols-[22rem_minmax(0,1fr)]",
        )}
      >
        <aside
          aria-label={t("community.evidenceMap.panelLabel")}
          className={cn(
            "absolute inset-x-0 bottom-0 top-auto z-[1100] flex max-h-[82dvh] min-h-0 flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl transition duration-200 lg:static lg:inset-auto lg:z-auto lg:max-h-none lg:min-w-0 lg:translate-y-0 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:opacity-100 lg:shadow-none",
            mobilePanelOpen
              ? "flex translate-y-0 opacity-100"
              : "hidden translate-y-3 opacity-0 lg:flex lg:pointer-events-auto",
            sidebarCollapsed && "lg:opacity-0 lg:pointer-events-none",
          )}
        >
          <div className="flex justify-center pt-2 pb-1 lg:hidden">
            <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="border-b border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("community.evidenceMap.title")}</h1>
              <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobilePanelOpen(false)} aria-label={t("community.evidenceMap.closeFilters")}>
                <X className="size-4" />
              </Button>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {t("community.evidenceMap.resetFilters")}
                </button>
              </div>
            )}

            <div className="mt-3.5 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("community.evidenceMap.searchPlaceholder")}
                aria-label={t("community.evidenceMap.searchLabel")}
                className="h-10 rounded-md border-input bg-background pl-9 pr-8 text-sm text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={t("community.evidenceMap.clearSearch")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <SelectField
                id="evidence-category"
                label={t("community.evidenceMap.category")}
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: t("community.evidenceMap.allCategories") },
                  ...categories.map((item) => ({ value: item, label: translateCategoryLabel(item, t) })),
                ]}
              />
              <SelectField
                id="evidence-status"
                label={t("community.evidenceMap.status")}
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: t("community.evidenceMap.allStatuses") },
                  ...statuses.map((item) => ({ value: item, label: translateStatusLabel(item, t) })),
                ]}
              />
            </div>

            <div className="mt-3">
              <Popover>
                <PopoverTrigger
                  render={<Button type="button" variant="outline" size="sm" className="gap-1.5" />}
                >
                  <SlidersHorizontal className="size-3.5" />
                  {popoverFilterCount > 0
                    ? t("community.evidenceMap.filtersCount", { count: popoverFilterCount })
                    : t("community.evidenceMap.filters")}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{t("community.evidenceMap.filters")}</p>
                    {popoverFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearMediaAndDateFilters}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t("community.evidenceMap.clear")}
                      </button>
                    )}
                  </div>

                  <fieldset>
                    <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{t("community.evidenceMap.mediaType")}</legend>
                    <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/50 p-1">
                      {([
                        { value: "all", label: t("community.evidenceMap.mediaAll"), icon: Layers3 },
                        { value: "image", label: t("community.evidenceMap.mediaPhotos"), icon: Camera },
                        { value: "video", label: t("community.evidenceMap.mediaVideos"), icon: Video },
                      ] as const).map((option) => {
                        const Icon = option.icon;
                        const isSelected = media === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMedia(option.value)}
                            aria-pressed={isSelected}
                            className={cn(
                              "flex h-9 items-center justify-center gap-1.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                              isSelected
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Icon className="size-3.5 shrink-0" /> {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label htmlFor="evidence-date-from" className="space-y-1">
                      <span className="block text-xs font-medium text-muted-foreground">{t("community.evidenceMap.fromDate")}</span>
                      <Input
                        id="evidence-date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        max={dateTo || undefined}
                        className="h-9 rounded-md border-input bg-background px-2.5 text-sm text-foreground"
                      />
                    </label>
                    <label htmlFor="evidence-date-to" className="space-y-1">
                      <span className="block text-xs font-medium text-muted-foreground">{t("community.evidenceMap.toDate")}</span>
                      <Input
                        id="evidence-date-to"
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        min={dateFrom || undefined}
                        className="h-9 rounded-md border-input bg-background px-2.5 text-sm text-foreground"
                      />
                    </label>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">{t("community.evidenceMap.mappedReports")}</p>
              {isFetching && !isLoading && <Loader2 className="size-3.5 animate-spin text-primary" />}
            </div>
            <TooltipProvider delay={200}>
              <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <div className="space-y-2.5 p-3">
                    {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-md bg-muted" />)}
                  </div>
                ) : filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => (
                    <ResultCard
                      key={issue.issueId}
                      issue={issue}
                      selected={visibleSelectedIssueId === issue.issueId}
                      onSelect={() => selectIssue(issue.issueId, true)}
                      cardRef={(element) => {
                        if (element) cardRefs.current.set(issue.issueId, element);
                        else cardRefs.current.delete(issue.issueId);
                      }}
                    />
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <MapPin className="size-5" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground">{t("community.evidenceMap.emptyTitle")}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {activeFilterCount > 0
                        ? t("community.evidenceMap.emptyFiltered")
                        : t("community.evidenceMap.emptyNone")}
                    </p>
                    {activeFilterCount > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        className="mt-4"
                      >
                        <RefreshCw className="size-3.5 text-primary" />
                        {t("community.evidenceMap.resetAllFilters")}
                      </Button>
                    ) : (
                      <Link
                        href="/report-issue"
                        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {t("community.evidenceMap.submitReport")}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </TooltipProvider>
          </div>
        </aside>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? t("community.evidenceMap.showSidebar") : t("community.evidenceMap.hideSidebar")}
          aria-expanded={!sidebarCollapsed}
          className={cn(
            "absolute top-1/2 z-[1150] hidden size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-[left] duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex",
            sidebarCollapsed ? "left-0" : "left-[22rem]",
          )}
        >
          {sidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>

        <main className="relative min-h-0 overflow-hidden">
          <SystemEvidenceMapCanvas issues={filteredIssues} selectedIssueId={visibleSelectedIssueId} onSelectIssue={selectIssue} />

          <div className="absolute left-3 right-3 top-3 z-[1000] flex items-center justify-between gap-3 lg:hidden">
            <div className="min-w-0 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm">
              <p className="truncate text-sm font-semibold text-foreground">{t("community.evidenceMap.title")}</p>
              <p className="text-xs text-muted-foreground">
                {t(filteredIssues.length === 1 ? "community.evidenceMap.reportCountOne" : "community.evidenceMap.reportCountMany", {
                  count: filteredIssues.length,
                })}
              </p>
            </div>
            <Button type="button" onClick={() => setMobilePanelOpen(true)} className="h-10 shrink-0">
              <SlidersHorizontal className="size-4" />
              {t("community.evidenceMap.filters")}
              {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </Button>
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background/40">
              <div className="rounded-lg border border-border bg-card px-5 py-4 text-center shadow-lg">
                <Loader2 className="mx-auto mb-2 size-5 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">{t("community.evidenceMap.locating")}</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 z-[900] flex items-center justify-center bg-background/50 p-4">
              <div className="max-w-sm rounded-lg border border-destructive/30 bg-card p-6 text-center shadow-lg">
                <AlertTriangle className="mx-auto mb-3 size-7 text-destructive" />
                <h2 className="text-base font-semibold text-foreground">{t("community.evidenceMap.unavailableTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {error instanceof Error
                    ? error.message === EVIDENCE_LOAD_FAILED ? t("community.evidenceMap.loadFailed") : error.message
                    : t("community.evidenceMap.tryAgainShortly")}
                </p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  {t("community.evidenceMap.tryAgain")}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
