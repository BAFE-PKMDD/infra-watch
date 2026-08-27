"use client";

import { Download, RefreshCw, Send, Sparkles, Square, Trash2, X } from "lucide-react";
import {
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { AiMessageContent } from "@/components/ai-message-content";
import { Button } from "@/components/ui/button";
import { cleanAniaAnswer } from "@/lib/analytics/ania-answer-content";
import { aniaPdfFilename, downloadElementAsPdf } from "@/lib/analytics/ania-answer-pdf";
import {
  appendToLastAssistantMessage,
  ensureAssistantMessage,
  type ChatMessage,
} from "@/lib/chat-messages";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";

const SUGGESTIONS = [
  "Which region has the most delayed projects?",
  "Why is there not enough data for project forecasting?",
  "What is the total budget allocated for these projects?",
];
const DISCLAIMER =
  "AI-generated analysis—verify against the dashboard before making official decisions.";

export function isManagerialAiFeatureEnabled(value: string | undefined) {
  return value === "true";
}

const FILTER_LABELS: Array<[
  keyof ManagerialDashboardFilters,
  string,
]> = [
  ["program", "Program"],
  ["year", "Year"],
  ["region", "Region"],
  ["province", "Province"],
  ["projectType", "Project type"],
  ["status", "Project status"],
  ["health", "Timeline status"],
];

function humanize(value: string) {
  if (value === "atRisk") return "At risk";
  if (value === "onTrack") return "On track";
  if (value === "notAssessed") return "Not assessed";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatManagerialFilterContext(filters: ManagerialDashboardFilters) {
  const parts = FILTER_LABELS.flatMap(([key, label]) => {
    const value = filters[key];
    return value ? [`${label}: ${humanize(value)}`] : [];
  });
  return parts.length ? parts.join(" · ") : "All authorized dashboard data";
}

export function managerialFilterContextKey(filters: ManagerialDashboardFilters) {
  return JSON.stringify(FILTER_LABELS.map(([key]) => filters[key] ?? null));
}

export function managerialCopilotErrorMessage(
  aborted: boolean,
  timedOut: boolean,
  error: unknown,
) {
  void error;
  if (aborted) {
    return timedOut
      ? "The response timed out. You can retry the last question."
      : "Response cancelled. You can retry the last question.";
  }
  return "ANIA is temporarily unavailable. You can retry the last question.";
}

type ManagerialAiCopilotProps = {
  filters: ManagerialDashboardFilters;
  asOf: string;
  initialOpen?: boolean;
  onRefresh?: () => Promise<unknown>;
  presentation?: "floating" | "embedded";
  initialConversationId?: string;
  initialPrompt?: string;
  briefContent?: string;
  dashboardContext?: { asOf: string; lastSuccessfulSyncAt: string | null };
};

export function AniaAnswerDownloadButton({ targetId, asOf, answerNumber, variant = "ghost" }: {
  targetId: string;
  asOf: string;
  answerNumber?: number;
  variant?: "default" | "outline" | "ghost";
}) {
  const [pdfState, setPdfState] = useState<"idle" | "preparing" | "error">("idle");
  const label = answerNumber ? `ANIA answer ${answerNumber}` : "ANIA executive brief";

  async function downloadPdf() {
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement)) {
      setPdfState("error");
      return;
    }
    setPdfState("preparing");
    try {
      await downloadElementAsPdf(target, aniaPdfFilename(asOf, answerNumber));
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  return (
    <Button
      variant={variant}
      size="sm"
      aria-label={`Download ${label} as PDF`}
      aria-busy={pdfState === "preparing"}
      disabled={pdfState === "preparing"}
      onClick={() => void downloadPdf()}
    >
      <Download /> {pdfState === "preparing"
        ? "Preparing PDF…"
        : pdfState === "error"
          ? "Retry PDF download"
          : answerNumber
            ? "Download PDF"
            : "Download executive brief PDF"}
    </Button>
  );
}

export function OptionalManagerialAiCopilot({
  enabled,
  ...props
}: ManagerialAiCopilotProps & { enabled: boolean }) {
  return enabled
    ? <ManagerialAiCopilot key={managerialFilterContextKey(props.filters)} {...props} />
    : null;
}

export type ManagerialAiCopilotHandle = {
  setInput: (value: string) => void;
};

export const ManagerialAiCopilot = forwardRef<ManagerialAiCopilotHandle, ManagerialAiCopilotProps>(function ManagerialAiCopilot({
  filters,
  asOf,
  initialOpen = false,
  onRefresh,
  presentation = "floating",
  initialConversationId,
  initialPrompt,
  briefContent,
  dashboardContext,
}, ref) {
  const embedded = presentation === "embedded";
  const [open, setOpen] = useState(initialOpen || embedded);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("ANIA is ready.");
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(initialConversationId ?? null);

  // Expose imperative handle so parent can set input without causing parent re-render
  useImperativeHandle(ref, () => ({
    setInput: (value: string) => {
      setInput(value);
      inputRef.current?.focus();
    },
  }), []);

  const hasOpenedRef = useRef(initialOpen);

  // Pre-fill input from initialPrompt (click-to-prompt)
  const appliedPromptRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialPrompt && initialPrompt !== appliedPromptRef.current) {
      appliedPromptRef.current = initialPrompt;
      setInput(initialPrompt);
      inputRef.current?.focus();
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (open && !embedded) {
      hasOpenedRef.current = true;
      inputRef.current?.focus();
      return;
    }
    if (hasOpenedRef.current) {
      const timer = window.setTimeout(() => launcherRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [embedded, open]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const close = useCallback(() => {
    controllerRef.current?.abort();
    if (!embedded) setOpen(false);
  }, [embedded]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  const send = useCallback(
    async (prompt?: string) => {
      const message = (prompt ?? input).trim();
      if (!message || loading) return;
      setOpen(true);
      setInput("");
      setMessages((current) => [...current, { role: "user", content: message }]);
      setLoading(true);
      setStatus("ANIA is analyzing the current dashboard.");
      setLastPrompt(message);

      const requestId = crypto.randomUUID();
      const controller = new AbortController();
      let timedOut = false;
      activeRequestRef.current = requestId;
      controllerRef.current?.abort();
      controllerRef.current = controller;
      conversationIdRef.current ??= crypto.randomUUID();
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 58_000);

      try {
        const response = await fetch("/api/admin/analytics/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            message,
            filters,
            ...(briefContent ? { briefContext: briefContent.slice(0, 12_000) } : {}),
            ...(dashboardContext ? { dashboardContext } : {}),
          }),
          signal: controller.signal,
        });
        if (activeRequestRef.current !== requestId) return;
        if (!response.ok) throw new Error("provider unavailable");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("provider unavailable");
        setMessages((current) => [
          ...current,
          { role: "assistant", content: "" },
        ]);
        const decoder = new TextDecoder();
        let answer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (activeRequestRef.current !== requestId) {
            await reader.cancel();
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          answer += chunk;
          setMessages((current) =>
            appendToLastAssistantMessage(current, chunk),
          );
        }
        answer += decoder.decode();
        const cleanedAnswer = cleanAniaAnswer(answer);
        setMessages((current) => {
          const lastMessage = current.at(-1);
          if (!lastMessage || lastMessage.role !== "assistant") return current;
          return [...current.slice(0, -1), { ...lastMessage, content: cleanedAnswer }];
        });
        setStatus("ANIA response complete.");
      } catch (error) {
        if (activeRequestRef.current !== requestId) return;
        const message = managerialCopilotErrorMessage(
          controller.signal.aborted,
          timedOut,
          error,
        );
        setMessages((current) => ensureAssistantMessage(current, message));
        setStatus(message);
      } finally {
        window.clearTimeout(timeout);
        if (activeRequestRef.current === requestId) {
          activeRequestRef.current = null;
          controllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [briefContent, dashboardContext, filters, input, loading],
  );

  function clear() {
    controllerRef.current?.abort();
    activeRequestRef.current = null;
    conversationIdRef.current = null;
    setLastPrompt(null);
    setMessages([]);
    setLoading(false);
    setStatus("Conversation cleared. ANIA is ready.");
  }

  async function refresh() {
    controllerRef.current?.abort();
    activeRequestRef.current = null;
    conversationIdRef.current = null;
    setLastPrompt(null);
    setMessages([]);
    setLoading(false);
    setRefreshing(true);
    setStatus("Refreshing dashboard data for ANIA.");
    try {
      await onRefresh?.();
      setStatus("Dashboard data refreshed. ANIA is ready.");
    } catch {
      setStatus("Dashboard refresh failed. The previous dashboard data remains available.");
    } finally {
      setRefreshing(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  if (!open && !embedded) {
    return (
      <Button ref={launcherRef} variant="outline" onClick={() => setOpen(true)}>
        <Sparkles /> Ask ANIA
      </Button>
    );
  }

  return (
    <section
      id="managerial-copilot-dialog"
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : "false"}
      aria-labelledby="managerial-copilot-title"
      className={embedded
        ? "flex min-h-[34rem] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        : "fixed inset-x-3 bottom-3 z-50 ml-auto flex max-h-[calc(100vh-1.5rem)] w-auto max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl motion-reduce:transition-none sm:right-5 sm:left-auto sm:w-[42rem] dark:border-slate-700 dark:bg-slate-950"}
    >
      <header className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="managerial-copilot-title" className="font-semibold">
              {embedded ? "Ask ANIA about this executive brief" : "ANIA"}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Data as of {asOf}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Refresh ANIA"
            >
              <RefreshCw className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />
            </Button>
            {!embedded ? <Button variant="ghost" size="icon" onClick={close} aria-label="Close ANIA">
              <X />
            </Button> : null}
          </div>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          {formatManagerialFilterContext(filters)}
        </p>
      </header>

      <div
        role="log"
        aria-label="ANIA managerial analytics conversation"
        aria-live="off"
        className="min-h-52 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {embedded
                ? "Ask a follow-up about the generated analysis. ANIA remains constrained to this executive brief’s active dashboard filters and authorized data scope."
                : "Ask a question about the active dashboard filters. No analysis is generated until you choose a prompt or send a question."}
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button key={suggestion} variant="outline" size="sm" onClick={() => void send(suggestion)}>
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              id={message.role === "assistant" ? `ania-answer-${index}` : undefined}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl bg-blue-900 px-3 py-2 text-sm text-white"
                  : "mr-auto w-full max-w-[96%] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              }
            >
              {message.role === "assistant" ? (
                <>
                  <AiMessageContent
                    content={message.content}
                    isStreaming={loading && index === messages.length - 1}
                  />
                  {!(loading && index === messages.length - 1) && message.content ? (
                    <div data-pdf-exclude="true" className="mt-2 flex justify-end border-t border-slate-200 pt-2 dark:border-slate-700">
                      <AniaAnswerDownloadButton
                        targetId={`ania-answer-${index}`}
                        asOf={asOf}
                        answerNumber={messages.slice(0, index + 1).filter((item) => item.role === "assistant").length}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                message.content
              )}
            </article>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>
        {lastPrompt && !loading && (
          <Button variant="outline" size="sm" onClick={() => void send(lastPrompt)}>
            Retry last question
          </Button>
        )}
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKeyDown}
            disabled={loading}
            maxLength={4_000}
            aria-label="Ask ANIA"
            placeholder="Ask about project risks, regions, or priority projects..."
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          />
          {loading ? (
            <Button variant="outline" size="icon" onClick={() => controllerRef.current?.abort()} aria-label="Cancel response">
              <Square />
            </Button>
          ) : (
            <Button size="icon" onClick={() => void send()} disabled={!input.trim()} aria-label="Send question">
              <Send />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={clear} aria-label="Clear conversation">
            <Trash2 />
          </Button>
        </div>
        <p className="mt-3 text-center text-[11px] font-medium text-amber-800 dark:text-amber-200">
          {DISCLAIMER}
        </p>
      </div>
    </section>
  );
});
