"use client";

import { AlertTriangle, FileText, RefreshCw, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AiMessageContent } from "@/components/ai-message-content";
import { ExecutiveBriefAnalytics } from "@/components/admin/dashboard/executive-brief-analytics";
import { AniaAnswerDownloadButton, ManagerialAiCopilot } from "@/components/admin/dashboard/managerial-ai-copilot";
import { Button } from "@/components/ui/button";
import { cleanAniaAnswer } from "@/lib/analytics/ania-answer-content";
import { tryParseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import {
  EXECUTIVE_BRIEF_DISCLAIMER,
  EXECUTIVE_BRIEF_HANDLING_LABEL,
  EXECUTIVE_BRIEF_PROMPT,
  executiveBriefPersistenceKey,
  executiveBriefStaleNudge,
  formatExecutiveBriefScope,
  shouldRetryExecutiveBrief,
  stripExecutiveBriefDisclaimer,
} from "@/lib/analytics/executive-brief";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import { useAuth } from "@/providers/auth-provider";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";

const BRIEF_TIMEOUT_MS = 115_000;
const RETRY_BACKOFF_MS = 750;

export function ExecutiveBriefClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => tryParseManagerialDashboardFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const query = useManagerialDashboard(filters ?? {}, filters ? user?.id : undefined);
  const [content, setContent] = useState("");
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [briefContext, setBriefContext] = useState<{
    asOf: string;
    filters: NonNullable<typeof filters>;
  } | null>(null);
  const [briefData, setBriefData] = useState<ManagerialDashboardData | null>(null);
  const [briefConversationId, setBriefConversationId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("Ready to generate an executive brief.");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const persistenceKey = user?.id && query.data
    ? executiveBriefPersistenceKey(
      user.id,
      filters ?? {},
      query.data.asOf,
      query.data.freshness.lastSuccessfulSyncAt,
    )
    : null;

  useEffect(() => {
    if (!persistenceKey || !query.data) return;
    let cancelled = false;
    try {
      const stored = window.sessionStorage.getItem(persistenceKey);
      if (!stored) {
        queueMicrotask(() => {
          if (cancelled) return;
          setContent("");
          setGeneratedAt(null);
          setBriefContext(null);
          setBriefData(null);
          setBriefConversationId(null);
          setStatus("Dashboard scope or data date changed. Generate a new executive brief for the current context.");
        });
        return;
      }
      const parsed = JSON.parse(stored) as { content?: unknown; generatedAt?: unknown; conversationId?: unknown };
      if (typeof parsed.content !== "string" || typeof parsed.generatedAt !== "string") return;
      const restoredDate = new Date(parsed.generatedAt);
      if (!Number.isFinite(restoredDate.getTime())) return;
      const restoredContext = { asOf: query.data.asOf, filters: { ...(filters ?? {}) } };
      queueMicrotask(() => {
        if (cancelled) return;
        setContent(cleanAniaAnswer(parsed.content as string));
        setGeneratedAt(restoredDate);
        setBriefContext(restoredContext);
        setBriefData(query.data);
        setBriefConversationId(typeof parsed.conversationId === "string" ? parsed.conversationId : crypto.randomUUID());
        setStatus("Restored the executive brief for this user, dashboard scope, and data date.");
      });
    } catch {
      window.sessionStorage.removeItem(persistenceKey);
    }
    return () => { cancelled = true; };
  }, [persistenceKey, filters, query.data]);

  async function generate() {
    if (!filters || generating || !query.data) return;

    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, BRIEF_TIMEOUT_MS);
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setGenerating(true);
    setContent("");
    setGeneratedAt(null);
    setBriefContext(null);
    setBriefData(null);
    setBriefConversationId(null);
    setStatus("Generating executive brief from the current authorized dashboard scope.");

    try {
      let response: Response | null = null;
      const conversationId = crypto.randomUUID();
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch("/api/admin/analytics/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message: EXECUTIVE_BRIEF_PROMPT,
            purpose: "executive-brief",
            filters,
            dashboardContext: {
              asOf: query.data.asOf,
              lastSuccessfulSyncAt: query.data.freshness.lastSuccessfulSyncAt,
            },
          }),
          signal: controller.signal,
        });
        if (!shouldRetryExecutiveBrief(attempt, response.status, false)) break;
        setStatus("The service was temporarily unavailable. Retrying once…");
        await new Promise((resolve) => window.setTimeout(resolve, RETRY_BACKOFF_MS));
      }
      if (!response) throw new Error("Executive brief response is unavailable");
      if (!response.ok) throw new Error("Unable to generate the executive brief");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Executive brief response is unavailable");

      const decoder = new TextDecoder();
      let brief = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        brief += decoder.decode(value, { stream: true });
        setContent(brief);
        setStatus("Drafting the four-lens analytical brief from verified dashboard results…");
      }
      brief += decoder.decode();
      brief = cleanAniaAnswer(stripExecutiveBriefDisclaimer(brief));
      setContent(brief);
      const completedAt = new Date();
      setGeneratedAt(completedAt);
      setBriefContext({ asOf: query.data.asOf, filters: { ...filters } });
      setBriefData(query.data);
      setBriefConversationId(conversationId);
      if (persistenceKey) window.sessionStorage.setItem(persistenceKey, JSON.stringify({ content: brief, generatedAt: completedAt.toISOString(), conversationId }));
      setStatus("Executive brief generated and ready to download.");
    } catch (error) {
      if (timedOut) {
        setStatus("Executive brief generation timed out. Please retry.");
      } else if (controller.signal.aborted) {
        setStatus("Executive brief generation cancelled.");
      } else {
        setStatus(error instanceof Error ? error.message : "Unable to generate the executive brief");
      }
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
      setGenerating(false);
    }
  }


  if (!filters) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        The executive brief URL contains invalid dashboard filters. Return to the dashboard and open the brief again.
      </div>
    );
  }

  if (query.isPending && !query.data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Loading the authorized dashboard scope…
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-200">
          {query.error instanceof Error ? query.error.message : "Dashboard analytics are unavailable."}
        </p>
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw /> Retry dashboard data
        </Button>
      </div>
    );
  }

  const data = query.data;
  const staleNudge = executiveBriefStaleNudge(data.asOf);
  const dashboardHref = searchParams.size ? `/dashboard?${searchParams.toString()}` : "/dashboard";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
              <FileText className="size-4 text-primary" /> Brief configuration
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Data as of {data.asOf}</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatExecutiveBriefScope(filters)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{EXECUTIVE_BRIEF_HANDLING_LABEL}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {content && generatedAt && briefContext && !generating ? (
              <AniaAnswerDownloadButton
                targetId="ania-executive-brief-report"
                asOf={briefContext.asOf}
                variant="default"
              />
            ) : null}
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching || generating}>
              <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
              Refresh data
            </Button>
            {generating ? (
              <Button variant="outline" onClick={() => controllerRef.current?.abort()}>
                <Square /> Cancel
              </Button>
            ) : (
              <Button variant={content ? "outline" : "default"} onClick={() => void generate()} disabled={query.isFetching}>
                <Sparkles /> {content ? "Regenerate brief" : "Generate brief"}
              </Button>
            )}
          </div>
        </div>
        <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {status}
        </p>
        {staleNudge ? <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {staleNudge}</p> : null}
      </section>

      <article id="ania-executive-brief-report" className="min-h-96 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        {content ? (
          <>
            <div className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Infrastructure Analytics</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Executive Brief</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Data as of {briefContext?.asOf ?? data.asOf} · {formatExecutiveBriefScope(briefContext?.filters ?? filters)}
              </p>
            </div>
            <AiMessageContent content={content} isStreaming={generating} />
            {!generating && briefData ? (
              <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
                <ExecutiveBriefAnalytics data={briefData} />
              </div>
            ) : null}
            <p className="mt-8 border-t border-amber-200 pt-4 text-xs font-medium text-amber-800 dark:border-amber-900 dark:text-amber-200">
              {EXECUTIVE_BRIEF_DISCLAIMER}
            </p>
          </>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <div className="rounded-full bg-blue-50 p-4 text-primary dark:bg-blue-950/40">
              <FileText className="size-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold">No executive brief generated yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Generate a decision-focused brief from the current authorized dashboard data and filters. The result stays separate from the ANIA conversation.
            </p>
            <Button className="mt-5 print:hidden" onClick={() => void generate()} disabled={query.isFetching || generating}><Sparkles /> Generate executive brief</Button>
          </div>
        )}
      </article>

      {content && briefContext && briefConversationId ? (
        <div className="print:hidden">
          <ManagerialAiCopilot
            key={`${briefConversationId}:${briefContext.asOf}`}
            filters={briefContext.filters}
            asOf={briefContext.asOf}
            initialOpen
            presentation="embedded"
            initialConversationId={briefConversationId}
            dashboardContext={{
              asOf: briefData?.asOf ?? briefContext.asOf,
              lastSuccessfulSyncAt: briefData?.freshness.lastSuccessfulSyncAt ?? null,
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="link" asChild>
          <Link href={dashboardHref}>Back to Infrastructure Analytics Dashboard</Link>
        </Button>
        {content && generatedAt && briefContext && !generating ? (
          <AniaAnswerDownloadButton targetId="ania-executive-brief-report" asOf={briefContext.asOf} />
        ) : null}
      </div>
    </div>
  );
}
