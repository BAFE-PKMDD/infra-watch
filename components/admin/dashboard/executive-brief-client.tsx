"use client";

import { Download, FileText, Printer, RefreshCw, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AiMessageContent } from "@/components/ai-message-content";
import { Button } from "@/components/ui/button";
import { tryParseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import {
  buildExecutiveBriefMarkdown,
  EXECUTIVE_BRIEF_PROMPT,
  executiveBriefFilename,
  formatExecutiveBriefScope,
} from "@/lib/analytics/executive-brief";
import { useManagerialDashboard } from "@/hooks/use-managerial-dashboard";
import { useAuth } from "@/providers/auth-provider";

const DISCLAIMER =
  "AI-generated analysis—verify against the Infrastructure Analytics Dashboard before making official decisions.";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("Ready to generate an executive brief.");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function generate() {
    if (!filters || generating || !query.data) return;

    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 58_000);
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setGenerating(true);
    setContent("");
    setGeneratedAt(null);
    setBriefContext(null);
    setStatus("Generating executive brief from the current authorized dashboard scope.");

    try {
      const response = await fetch("/api/admin/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: crypto.randomUUID(),
          message: EXECUTIVE_BRIEF_PROMPT,
          purpose: "executive-brief",
          filters,
        }),
        signal: controller.signal,
      });
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
      }
      brief += decoder.decode();
      setContent(brief);
      setGeneratedAt(new Date());
      setBriefContext({ asOf: query.data.asOf, filters: { ...filters } });
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

  function download() {
    if (!content || !generatedAt || !briefContext) return;
    const markdown = buildExecutiveBriefMarkdown({
      content,
      filters: briefContext.filters,
      asOf: briefContext.asOf,
      generatedAt,
    });
    downloadText(executiveBriefFilename(briefContext.asOf), markdown);
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
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {formatExecutiveBriefScope(filters)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching || generating}>
              <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
              Refresh data
            </Button>
            {generating ? (
              <Button variant="outline" onClick={() => controllerRef.current?.abort()}>
                <Square /> Cancel
              </Button>
            ) : (
              <Button onClick={() => void generate()} disabled={query.isFetching}>
                <Sparkles /> {content ? "Regenerate brief" : "Generate brief"}
              </Button>
            )}
          </div>
        </div>
        <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {status}
        </p>
      </section>

      <article className="min-h-96 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
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
            <p className="mt-8 border-t border-amber-200 pt-4 text-xs font-medium text-amber-800 dark:border-amber-900 dark:text-amber-200">
              {DISCLAIMER}
            </p>
          </>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <div className="rounded-full bg-blue-50 p-4 text-primary dark:bg-blue-950/40">
              <FileText className="size-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold">No executive brief generated yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Generate a decision-focused brief from the current authorized dashboard data and filters. The result stays separate from the AI Copilot conversation.
            </p>
          </div>
        )}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="link" asChild>
          <Link href={dashboardHref}>Back to Infrastructure Analytics Dashboard</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()} disabled={!content || generating}>
            <Printer /> Print / save as PDF
          </Button>
          <Button onClick={download} disabled={!content || !generatedAt || !briefContext || generating}>
            <Download /> Download Markdown
          </Button>
        </div>
      </div>
    </div>
  );
}
