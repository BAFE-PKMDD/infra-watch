"use client";

import { useMemo, useState } from "react";

import { AiMessageContent } from "@/components/ai-message-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type BriefSection,
  deduplicateSectionTabs,
  parseBriefSections,
} from "@/lib/analytics/brief-heading-map";
import {
  formatDashboardCompactCurrency,
  formatDashboardCount,
  formatDashboardPercentage,
} from "./executive-kpis";
import { KpiCard } from "./kpi-card";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FolderKanban,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  /** Raw AI-generated markdown content */
  content: string;
  /** Dashboard data for the KPI strip */
  data: ManagerialDashboardData | null;
  /** Whether the brief is still streaming */
  isStreaming: boolean;
  /** Callback to open the copilot drawer with a pre-filled prompt */
  onAskAbout?: (prompt: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Status badge injection                                             */
/* ------------------------------------------------------------------ */

/**
 * Replace status text markers with badge-styled HTML spans.
 * Applied to section body content before rendering.
 */
function injectStatusBadges(markdown: string): string {
  let result = markdown;

  // [!] marker → destructive badge
  result = result.replace(
    /\[!\]\s*/g,
    '[⚠ Attention](#badge-attention) ',
  );

  // 🔴 Critical
  result = result.replace(
    /🔴\s*/g,
    '[Critical](#badge-critical) ',
  );

  // ✅ On Track / Completed
  result = result.replace(
    /✅\s*/g,
    '[On Track](#badge-on-track) ',
  );

  // ⚠️ Warning
  result = result.replace(
    /⚠️\s*/g,
    '[Warning](#badge-warning) ',
  );

  // Standalone "Delayed" near numbers or at start of items
  result = result.replace(
    /\b(Delayed)\b(?=[\s,;:—–]|$)/g,
    '[Delayed](#badge-delayed)',
  );

  // "At Risk" / "At-risk"
  result = result.replace(
    /\bAt[\s-]?[Rr]isk\b/g,
    '[At Risk](#badge-at-risk)',
  );

  // "On Track" / "On Schedule"
  result = result.replace(
    /\bOn[\s-]?[Tt]rack\b/g,
    '[On Track](#badge-on-track)',
  );

  return result;
}

/* ------------------------------------------------------------------ */
/*  Click-to-prompt detection                                          */
/* ------------------------------------------------------------------ */

/**
 * Detect anomaly phrases and wrap them in clickable spans.
 * Patterns: "X projects delayed", "X critical", "X at risk", etc.
 */
function injectClickToPrompt(markdown: string): string {
  // "N projects in critical delay" / "N projects delayed"
  let result = markdown.replace(
    /\b(\d+)\s+projects?\s+(?:in\s+)?(?:critical\s+)?delay(?:ed)?\b/gi,
    (match) => {
      const prompt = `Explain the delay causes and recommended actions for the ${match.trim()}.`;
      return `[${match}](#prompt-${encodeURIComponent(prompt)})`;
    },
  );

  // "N at risk"
  result = result.replace(
    /\b(\d+)\s+(?:projects?\s+)?at[\s-]risk\b/gi,
    (match) => {
      const prompt = `What are the key risk factors for the ${match.trim()}?`;
      return `[${match}](#prompt-${encodeURIComponent(prompt)})`;
    },
  );

  return result;
}

/* ------------------------------------------------------------------ */
/*  KPI Strip                                                          */
/* ------------------------------------------------------------------ */

function BriefKpiStrip({ data }: { data: ManagerialDashboardData }) {
  const assessedProjects = data.scheduleHealth.reduce(
    (total, entry) => (entry.key === "notAssessed" ? total : total + entry.count),
    0,
  );

  return (
    <section aria-label="Brief key metrics" className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Projects"
          value={formatDashboardCount(data.kpis.totalProjects)}
          definition="Count of projects in the authorized scope after dashboard filters."
          icon={<FolderKanban className="size-4" />}
        />
        <KpiCard
          label="Allocated Budget"
          value={
            data.coverage.withBudget === 0
              ? "Unavailable"
              : formatDashboardCompactCurrency(data.kpis.allocatedBudget)
          }
          definition="Sum of non-null allocated amounts from ABEMIS."
          icon={<Banknote className="size-4" />}
        />
        <KpiCard
          label="Completion Rate"
          value={formatDashboardPercentage(data.kpis.completionRate)}
          definition="Completed projects divided by all status-assessed projects."
          icon={<CheckCircle2 className="size-4" />}
        />
        <KpiCard
          label="Delayed Projects"
          value={formatDashboardCount(data.kpis.delayedProjects)}
          definition="Incomplete projects past their target completion date."
          detail={`${formatDashboardCount(data.kpis.atRiskProjects)} at risk · ${formatDashboardCount(assessedProjects)} assessed`}
          tone={data.kpis.delayedProjects > 0 ? "critical" : "default"}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton for brief loading                                         */
/* ------------------------------------------------------------------ */

function BriefGeneratingSkeleton() {
  const contentSkeletonHeights = [72, 88, 64, 96, 76, 84];

  return (
    <div className="space-y-6">
      {/* KPI strip skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-md border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
      {/* Tabs skeleton */}
      <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
      {/* Content skeleton */}
      <div className="space-y-4">
        {contentSkeletonHeights.map((height, i) => (
          <div
            key={i}
            className="animate-pulse rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section content renderer                                           */
/* ------------------------------------------------------------------ */

function SectionContent({
  section,
  onAskAbout,
}: {
  section: BriefSection;
  onAskAbout?: (prompt: string) => void;
}) {
  // Process body: inject badges and click-to-prompt links
  const processedBody = useMemo(() => {
    let body = section.body;
    body = injectStatusBadges(body);
    if (onAskAbout) {
      body = injectClickToPrompt(body);
    }
    return body;
  }, [section.body, onAskAbout]);

  return (
    <div
      className="brief-section-content"
      onClick={(e) => {
        // Handle click-to-prompt button clicks
        const target = e.target as HTMLElement;
        const promptButton = target.closest("[data-brief-prompt]");
        if (promptButton && onAskAbout) {
          const prompt = decodeURIComponent(
            promptButton.getAttribute("data-brief-prompt") ?? "",
          );
          if (prompt) onAskAbout(prompt);
        }
      }}
    >
      <AiMessageContent content={processedBody} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ExecutiveBriefStructuredView({
  content,
  data,
  isStreaming,
  onAskAbout,
}: Props) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Parse sections only when not streaming
  const sections = useMemo(() => {
    if (isStreaming || !content) return [];
    const parsed = parseBriefSections(content);
    return deduplicateSectionTabs(parsed);
  }, [content, isStreaming]);

  // Set initial active tab when sections first become available
  const resolvedTab = activeTab ?? sections[0]?.tabKey ?? "overview";

  // Streaming state: show skeleton
  if (isStreaming) {
    return (
      <div className="space-y-4">
        {data && <BriefKpiStrip data={data} />}
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
          <Sparkles className="size-4 animate-pulse text-primary" />
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              Generating executive brief…
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Analyzing infrastructure data for the selected projects.
              This typically takes 15–30 seconds.
            </p>
          </div>
        </div>
        <BriefGeneratingSkeleton />
      </div>
    );
  }

  // No content
  if (!content || sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* KPI strip from authoritative dashboard data */}
      {data && <BriefKpiStrip data={data} />}

      {/* Tabbed sections */}
      {sections.length === 1 ? (
        // Single section — no tabs needed
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = sections[0].icon;
              return (
                <div className="rounded-lg bg-blue-50 p-2 text-primary dark:bg-blue-950/40">
                  <Icon className="size-4" />
                </div>
              );
            })()}
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              {sections[0].heading}
            </h3>
          </div>
          <SectionContent section={sections[0]} onAskAbout={onAskAbout} />
        </div>
      ) : (
        <Tabs
          value={resolvedTab}
          onValueChange={(value) => setActiveTab(value as string)}
        >
          <TabsList
            variant="line"
            className="w-full flex-wrap justify-start gap-0"
          >
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.tabKey} value={section.tabKey}>
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{section.heading}</span>
                  <span className="sm:hidden">
                    {section.heading.split(" ")[0]}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {sections.map((section) => (
            <TabsContent
              key={section.tabKey}
              value={section.tabKey}
              className="mt-4"
            >
              <SectionContent section={section} onAskAbout={onAskAbout} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* AI disclaimer badge */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <span className="inline-flex h-5 shrink-0 items-center rounded-4xl border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">
          AI Generated
        </span>
        <span>
          This analysis is AI-generated from authorized dashboard data. Verify
          against official records before making decisions.
        </span>
      </div>
    </div>
  );
}
