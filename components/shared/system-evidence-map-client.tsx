"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  ChevronRight,
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getSystemEvidenceLocationLabel,
  parseSystemEvidenceResponse,
  type SystemEvidenceIssue,
  type SystemEvidenceMediaType,
} from "@/components/shared/system-evidence-map-types";

const SystemEvidenceMapCanvas = dynamic(
  () => import("@/components/shared/system-evidence-map-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[28rem] w-full items-center justify-center bg-slate-200 dark:bg-slate-900">
        <div className="rounded-2xl border border-white/70 bg-white/90 px-5 py-4 text-center shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin text-emerald-600" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">Preparing evidence map</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loading the geographic canvas…</p>
        </div>
      </div>
    ),
  },
);

type MediaFilter = "all" | SystemEvidenceMediaType;

async function fetchSystemEvidence() {
  const response = await fetch("/api/evidence", {
    headers: { Accept: "application/json" },
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: unknown }).error
      : null;
    throw new Error(typeof error === "string" ? error : "Unable to load geotagged evidence.");
  }

  return parseSystemEvidenceResponse(payload);
}

function formatLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "resolved") return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (status === "reviewing" || status === "in-progress") return "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300";
  if (status === "closed" || status === "suspended") return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
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
    <label htmlFor={id} className="space-y-1.5">
      <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
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
  const imageCount = issue.evidence.filter((item) => item.type === "image").length;
  const videoCount = issue.evidence.filter((item) => item.type === "video").length;

  return (
    <article
      ref={cardRef}
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm transition-all [content-visibility:auto] [contain-intrinsic-size:0_180px] dark:bg-slate-950",
        selected
          ? "border-emerald-500 ring-2 ring-emerald-500/15"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{issue.ticketNumber}</p>
            <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-900 dark:text-white">{issue.description}</p>
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide", statusTone(issue.status))}>
            {formatLabel(issue.status)}
          </span>
        </div>

        <div className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="line-clamp-2">{getSystemEvidenceLocationLabel(issue)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-5 max-w-full truncate border-slate-200 bg-slate-50 text-[10px] dark:border-slate-700 dark:bg-slate-900">
            {formatLabel(issue.category)}
          </Badge>
          {imageCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <Camera className="size-3" /> {imageCount}
            </span>
          )}
          {(videoCount > 0 || issue.geoVideoTrack.length > 0) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300">
              <Video className="size-3" /> {videoCount || 1}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <CalendarDays className="size-3" /> {formatDate(issue.createdAt)}
          </span>
        </div>
      </button>

      <Link
        href={issue.detailUrl}
        className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
      >
        {issue.sourceType === "feedback" ? "View project feedback" : "View full report"}
        <ChevronRight className="size-3.5" />
      </Link>
    </article>
  );
}

export function SystemEvidenceMapClient() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [media, setMedia] = useState<MediaFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
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

  const selectIssue = (issueId: string, revealMap = false) => {
    setSelectedIssueId(issueId);
    if (revealMap) setMobilePanelOpen(false);
  };

  return (
    <section className="relative isolate h-[calc(100dvh-5rem)] min-h-[42rem] overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid h-full lg:grid-cols-[23rem_minmax(0,1fr)]">
        <aside
          aria-label="Evidence map filters and results"
          className={cn(
            "absolute inset-x-3 bottom-3 top-20 z-[1100] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/97 shadow-2xl backdrop-blur-xl transition duration-200 dark:border-slate-700 dark:bg-slate-950/97 lg:static lg:z-auto lg:translate-y-0 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:opacity-100 lg:shadow-none",
            mobilePanelOpen
              ? "flex translate-y-0 opacity-100"
              : "hidden translate-y-3 opacity-0 lg:flex lg:pointer-events-auto",
          )}
        >
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_48%)] p-5 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">Field evidence atlas</p>
                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Evidence Map</h1>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-400">Explore citizen-submitted photos and GeoVideo routes by location.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobilePanelOpen(false)} aria-label="Close filters">
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-lg font-black text-slate-950 dark:text-white">{filteredIssues.length}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Reports</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{evidenceCount}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Media</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-lg font-black text-sky-700 dark:text-sky-400">{routeCount}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Routes</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports or places"
                aria-label="Search evidence reports"
                className="h-9 bg-slate-50 pl-8 text-xs dark:bg-slate-900"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <SelectField
                id="evidence-category"
                label="Category"
                value={category}
                onChange={setCategory}
                options={[{ value: "all", label: "All categories" }, ...categories.map((item) => ({ value: item, label: formatLabel(item) }))]}
              />
              <SelectField
                id="evidence-status"
                label="Status"
                value={status}
                onChange={setStatus}
                options={[{ value: "all", label: "All statuses" }, ...statuses.map((item) => ({ value: item, label: formatLabel(item) }))]}
              />
            </div>

            <fieldset className="mt-3">
              <legend className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Media</legend>
              <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                {([
                  { value: "all", label: "All", icon: Layers3 },
                  { value: "image", label: "Photos", icon: Camera },
                  { value: "video", label: "Videos", icon: Video },
                ] as const).map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMedia(option.value)}
                      aria-pressed={media === option.value}
                      className={cn(
                        "flex h-8 items-center justify-center gap-1 rounded-md text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                        media === option.value
                          ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200",
                      )}
                    >
                      <Icon className="size-3" /> {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label htmlFor="evidence-date-from" className="space-y-1.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">From</span>
                <Input id="evidence-date-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} max={dateTo || undefined} className="h-9 bg-white px-2 text-[11px] dark:bg-slate-950" />
              </label>
              <label htmlFor="evidence-date-to" className="space-y-1.5">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">To</span>
                <Input id="evidence-date-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} min={dateFrom || undefined} className="h-9 bg-white px-2 text-[11px] dark:bg-slate-950" />
              </label>
            </div>

            {activeFilterCount > 0 && (
              <button type="button" onClick={resetFilters} className="mt-3 text-[11px] font-bold text-emerald-700 hover:underline dark:text-emerald-400">
                Clear {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Mapped reports</p>
              {isFetching && !isLoading && <Loader2 className="size-3.5 animate-spin text-emerald-600" />}
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 overscroll-contain">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)
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
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                  <MapPin className="mx-auto mb-2 size-6 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No mapped evidence found</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Try widening the date range or clearing a filter.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="relative min-h-0 overflow-hidden">
          <SystemEvidenceMapCanvas issues={filteredIssues} selectedIssueId={visibleSelectedIssueId} onSelectIssue={selectIssue} />

          <div className="absolute left-14 right-14 top-3 z-[1000] flex items-center justify-between gap-3 lg:hidden">
            <div className="min-w-0 rounded-xl border border-white/70 bg-white/92 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/92">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">Evidence Map</p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{filteredIssues.length} geotagged report{filteredIssues.length === 1 ? "" : "s"}</p>
            </div>
            <Button type="button" onClick={() => setMobilePanelOpen(true)} className="h-10 bg-slate-950 text-white shadow-lg hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              <SlidersHorizontal className="size-4" />
              Filters
              {activeFilterCount > 0 && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>}
            </Button>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 z-[800] flex flex-wrap gap-2 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-[10px] font-bold text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300 lg:bottom-5 lg:left-5">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" /> Photo</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-600 ring-2 ring-white" /> Video</span>
            <span className="inline-flex items-center gap-1.5"><Route className="size-3 text-sky-600" /> GeoVideo route</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-400 ring-2 ring-white" /> Live video position</span>
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-[900] flex items-center justify-center bg-slate-950/15 backdrop-blur-[1px]">
              <div className="rounded-2xl border border-white/70 bg-white/95 px-5 py-4 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-950/95">
                <Loader2 className="mx-auto mb-2 size-5 animate-spin text-emerald-600" />
                <p className="text-sm font-bold">Locating evidence…</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 z-[900] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
              <div className="max-w-sm rounded-2xl border border-red-200 bg-white p-6 text-center shadow-2xl dark:border-red-900 dark:bg-slate-950">
                <AlertTriangle className="mx-auto mb-3 size-7 text-red-500" />
                <h2 className="text-base font-black">Evidence map unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{error instanceof Error ? error.message : "Please try again shortly."}</p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
                  {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Try again
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
