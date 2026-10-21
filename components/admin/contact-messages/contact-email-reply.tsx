"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, CircleAlert, Mail, Send } from "lucide-react";
import { replyToContactMessage } from "@/actions/mutation/contact.mutation";
import { Button } from "@/components/ui/button";
import {
  contentButtonClass,
  contentControlClass,
} from "@/components/admin/content/content-controls";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 10;
const MAX_LENGTH = 10000;

export function ContactEmailReply({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [length, setLength] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const router = useRouter();
  const responseId = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const response = String(new FormData(form).get("response") || "");
    setPending(true);
    setResult(null);
    try {
      responseId.current ??= crypto.randomUUID();
      const sent = await replyToContactMessage(id, response, responseId.current);
      setResult(sent);
      if ("retryable" in sent && sent.retryable) responseId.current = null;
      if (sent.success) {
        responseId.current = null;
        form.reset();
        setLength(0);
        router.refresh();
      }
    } catch {
      setResult({
        success: false,
        error: "Email could not be sent. Your response is still here.",
      });
    } finally {
      setPending(false);
    }
  }
  const tooShort = length > 0 && length < MIN_LENGTH;
  return (
    <details className="group mt-5 rounded-lg border border-slate-200 bg-slate-50/70 open:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:open:bg-slate-950/60">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-100 dark:hover:bg-slate-900 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Mail className="size-4 text-blue-700 dark:text-sky-300" aria-hidden="true" />
          Reply through INFRA Watch
        </span>
        <ChevronDown
          className="size-4 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400"
          aria-hidden="true"
        />
      </summary>
      <form onSubmit={submit} className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`reply-${id}`} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Staff response
          </label>
          <span
            aria-live="polite"
            className={cn(
              "text-sm tabular-nums",
              tooShort ? "text-amber-800 dark:text-amber-300" : "text-slate-600 dark:text-slate-400",
            )}
          >
            {tooShort
              ? `${MIN_LENGTH - length} more characters needed`
              : `${length.toLocaleString("en-PH")} / ${MAX_LENGTH.toLocaleString("en-PH")}`}
          </span>
        </div>
        <textarea
          id={`reply-${id}`}
          name="response"
          required
          minLength={MIN_LENGTH}
          maxLength={MAX_LENGTH}
          rows={5}
          disabled={pending}
          placeholder="Write your reply to the sender…"
          className={cn(contentControlClass, "resize-y bg-white leading-6 dark:bg-slate-900")}
          onChange={(event) => {
            responseId.current = null;
            setLength(event.target.value.length);
          }}
        />
        {result ? (
          <p
            role={result.success ? "status" : "alert"}
            className={cn(
              "flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium",
              result.success
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
            )}
          >
            {result.success ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            {result.success ? "Email response sent." : result.error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sends an email using the Contact Response template. A successful reply
            marks the message in progress.
          </p>
          <Button type="submit" className={cn(contentButtonClass, "shrink-0 gap-2 sm:min-w-44")} disabled={pending}>
            <Send className="size-4" aria-hidden="true" />
            {pending ? "Sending…" : "Send email response"}
          </Button>
        </div>
      </form>
    </details>
  );
}
