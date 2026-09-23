"use client";

import { BatteryFull, ChevronDown, ChevronLeft, Mic, Plus, SignalHigh, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

const TYPING_MS = 8000;
const REPLY_DELAY_MS = 1200;
const REPLY_AT_MS = TYPING_MS + REPLY_DELAY_MS;
const CYCLE_MS = 20000;
const TICK_MS = 60;

export function SmsPhoneMockup({
  contactName,
  label,
  message,
  reply,
  className,
}: {
  contactName: string;
  label: string;
  message: string;
  reply?: string;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsed((Date.now() - start) % CYCLE_MS);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const isTyping = elapsed < TYPING_MS;
  const typedChars = isTyping ? Math.min(message.length, Math.round((elapsed / TYPING_MS) * message.length)) : message.length;
  const draft = message.slice(0, typedChars);
  const showReply = Boolean(reply) && elapsed >= REPLY_AT_MS;

  return (
    <div className={className}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="relative mx-auto w-full max-w-[320px]">
        <span aria-hidden="true" className="absolute -left-[3px] top-[112px] h-9 w-[3px] rounded-l-sm bg-slate-600" />
        <span aria-hidden="true" className="absolute -left-[3px] top-[166px] h-14 w-[3px] rounded-l-sm bg-slate-600" />
        <span aria-hidden="true" className="absolute -right-[3px] top-[142px] h-[70px] w-[3px] rounded-r-sm bg-slate-600" />

        <div className="rounded-[3rem] border-[9px] border-slate-800 bg-slate-800 shadow-xl ring-1 ring-slate-300/50 dark:ring-slate-500/50">
          <div className="flex aspect-[9/18] flex-col overflow-hidden rounded-[2.4rem] bg-white dark:bg-slate-950">
            <div className="shrink-0">
              <div className="flex items-center justify-between px-7 pt-2 text-xs font-semibold text-slate-950 dark:text-white">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <SignalHigh aria-hidden="true" className="size-4" />
                  <Wifi aria-hidden="true" className="size-4" />
                  <BatteryFull aria-hidden="true" className="size-[18px]" />
                </div>
              </div>
              <div className="mx-auto -mt-4 mb-1 h-7 w-28 rounded-full bg-slate-950 dark:bg-black" />

              <div className="flex items-start justify-between px-3 pb-2">
                <ChevronLeft aria-hidden="true" className="mt-2 size-5 shrink-0 text-primary" />
                <div className="flex flex-1 flex-col items-center">
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">IW</div>
                  <div className="mt-1 flex items-center gap-0.5">
                    <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">{contactName}</p>
                    <ChevronDown aria-hidden="true" className="size-3 text-slate-400" />
                  </div>
                </div>
                <div className="size-5 shrink-0" />
              </div>
            </div>

            <div className={`flex flex-1 flex-col gap-2.5 overflow-y-auto border-t border-slate-200 bg-slate-100 px-3.5 py-4 dark:border-slate-800 dark:bg-slate-900 ${showReply ? "justify-start" : "justify-end"}`}>
              {!showReply && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-xs leading-5 break-words whitespace-pre-line text-white">
                  {draft}
                  {isTyping && <span aria-hidden="true" className="animate-pulse">|</span>}
                </div>
              )}
              {showReply && (
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-200 px-4 py-3 text-xs leading-5 break-words whitespace-pre-line text-slate-900 dark:bg-slate-700 dark:text-slate-100">
                  {reply}
                </div>
              )}
            </div>

            <div className="shrink-0">
              <div className="flex items-center gap-2 border-t border-slate-200 px-3.5 py-2 dark:border-slate-800">
                <Plus aria-hidden="true" className="size-5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div className="flex min-h-7 flex-1 items-center justify-between gap-2 rounded-3xl border border-slate-300 px-3 py-1 dark:border-slate-700">
                  <span className="text-xs leading-4 text-slate-400 dark:text-slate-500">Text Message</span>
                  <Mic aria-hidden="true" className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
              <div className="flex justify-center pb-2">
                <div className="h-1 w-28 rounded-full bg-slate-950/70 dark:bg-white/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
