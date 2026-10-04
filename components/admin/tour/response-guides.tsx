"use client";

import { useContext } from "react";
import { ChevronDown } from "lucide-react";
import { TourContext } from "./tour-launcher";
import { tourKey } from "@/lib/tours/progress";

const channels = {
  issues: { label: "E-Report", description: "Review a report and send a response." },
  feedback: { label: "Feedback", description: "Reply in the feedback conversation." },
  sms: { label: "SMS Grievances", description: "Respond to a message and review its history." },
  contact_messages: { label: "Contact Messages", description: "Reply by email and update the message status." },
};

export function ResponseGuides({ fallbackOnly = false }: { fallbackOnly?: boolean }) {
  const context = useContext(TourContext);
  const guides = context?.learning;
  if (!context || !guides?.lessons.length) return null;
  if (fallbackOnly && guides.homePath !== "/admin-projects") return null;

  return <details data-tour="response-guides" className="group mb-6 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-900 [&::-webkit-details-marker]:hidden">
      <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
        <span className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">Response guides</span>
        <span className="text-sm text-slate-600 dark:text-slate-300">Step-by-step assistance for handling citizen concerns.</span>
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-slate-600 group-open:rotate-180 dark:text-slate-300" />
    </summary>
    <div className="border-t border-slate-200 px-4 dark:border-slate-800">
      {guides.loading ? <p role="status" className="pt-4 text-sm text-slate-600 dark:text-slate-300">Loading your guide history…</p> : !guides.progress ? <p role="status" className="pt-4 text-sm text-slate-600 dark:text-slate-300">Guide history is unavailable. You can still open any guide.</p> : null}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {guides.lessons.map((guide) => {
          const channel = channels[guide.resource];
          const reviewed = guides.progress?.seen[tourKey(guide.id)] === "completed";
          const action = reviewed ? "Review guide" : "Open guide";
          return <li key={guide.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{channel.label}</h3>
            <p className="col-start-1 row-start-2 text-sm text-slate-600 sm:col-start-2 sm:row-start-1 dark:text-slate-300">{channel.description}</p>
            <button type="button" disabled={guides.loading || guides.active} onClick={() => guides.startLesson(guide)} aria-label={`${action}: ${channel.label}`} className="col-start-2 row-span-2 row-start-1 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 sm:col-start-3 sm:row-span-1">{action}</button>
          </li>;
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 py-2 dark:border-slate-800">
        <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Example data only. No messages are sent or records changed.</p>
        <button type="button" disabled={guides.active} onClick={() => context.start(true)} className="min-h-11 rounded-md px-2 text-sm font-medium text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:text-slate-200">View feature tour</button>
      </div>
    </div>
  </details>;
}
