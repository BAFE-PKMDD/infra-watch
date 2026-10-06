"use client";

import { useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";

import type { SmsConversationItem } from "@/types/sms-grievance.types";

// Outbound replies are simulated everywhere except a staff-simulated test message's
// acknowledgment, which actually goes out over the real gateway (see
// lib/sms-grievance/simulate-incoming.ts) — a short tag tells staff plainly which one
// they're looking at instead of leaving it to the body text alone.
function deliveryAnnotation(item: SmsConversationItem) {
  if (item.kind !== "outbound_sms") return null;
  switch (item.deliveryStatus) {
    case "sent": return "Sent";
    case "send_failed": return "Failed to send";
    case "simulated_pending": return "Sending";
    case "simulated_failed": return "Simulated";
    case "simulated_delivered": return "Simulated";
    default: return null;
  }
}

function formatTime(occurredAt: string) {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Reads like a text thread: what the sender wrote on the left, what the team sent on the
// right, and staff-only notes and status changes as centred markers in between. Oldest at
// the top, with the view opened at the latest message.
export type SmsReplyComposer = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  /** True while a send is in flight, so a slow real SMS can't be triggered twice. */
  disabled?: boolean;
  helper: string;
};

export function SmsConversationTimeline({ conversation, composer }: { conversation: SmsConversationItem[]; composer?: SmsReplyComposer }) {
  const listRef = useRef<HTMLOListElement>(null);
  const ordered = conversation
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (new Date(a.item.occurredAt).getTime() - new Date(b.item.occurredAt).getTime()) || a.index - b.index)
    .map(({ item }) => item);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [conversation.length]);

  return (
    <section aria-labelledby="sms-conversation-title" className="border-t border-slate-200 pt-5 dark:border-slate-800">
      <h3 id="sms-conversation-title" className="font-heading text-lg font-semibold">Conversation</h3>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <ol
        ref={listRef}
        aria-label="Messages with this sender, oldest first"
        className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto bg-slate-50 p-3 sm:p-4 dark:bg-slate-950"
      >
        {ordered.map((item) => {
          const time = formatTime(item.occurredAt);
          if (item.kind === "status_event" || item.kind === "internal_note") {
            const isNote = item.kind === "internal_note";
            return (
              <li key={item.id} className="flex justify-center">
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-center text-sm leading-6 ${isNote
                  ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  : "text-slate-600 dark:text-slate-300"}`}
                >
                  <p className="text-xs font-bold">{isNote ? "Internal note · staff only" : "Case status"}{time && <span className="ml-2 font-normal">{time}</span>}</p>
                  <p className="mt-0.5 break-words">{item.body}</p>
                </div>
              </li>
            );
          }

          const outbound = item.kind === "outbound_sms";
          const annotation = deliveryAnnotation(item);
          return (
            <li key={item.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] ${outbound ? "items-end text-right" : "items-start"} flex flex-col`}>
                <p className="mb-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {outbound ? (item.purpose === "details_request" ? "InfraWatch team · asked for details" : "InfraWatch team") : "Sender"}
                </p>
                <p className={`whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-left text-sm leading-6 ${outbound
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}
                >
                  {item.body}
                </p>
                <p className={`mt-1 text-xs ${annotation === "Failed to send" ? "font-bold text-red-700 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {[time, annotation].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {composer && (
        <form
          data-tour="sms-reply-box"
          className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          onSubmit={(event) => {
            event.preventDefault();
            if (!composer.disabled && composer.value.trim()) void composer.onSend();
          }}
        >
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="simulated-response">Reply text</label>
            <textarea
              id="simulated-response"
              rows={2}
              value={composer.value}
              onChange={(event) => composer.onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!composer.disabled && composer.value.trim()) void composer.onSend();
                }
              }}
              className="max-h-40 min-h-11 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950"
              placeholder="Write a reply to the sender"
            />
            <button
              type="submit"
              data-tour="sms-send"
              disabled={composer.disabled || !composer.value.trim()}
              aria-label={composer.disabled ? "Sending reply" : "Send reply"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendHorizontal aria-hidden="true" className="size-5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{composer.helper} Enter sends, Shift+Enter adds a new line.</p>
        </form>
      )}
      </div>
    </section>
  );
}
