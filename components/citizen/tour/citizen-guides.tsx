"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { CITIZEN_GUIDES } from "@/lib/tours/citizen";
import { tourKey } from "@/lib/tours/progress";
import { useCitizenGuide } from "./citizen-guide-context";

const locations = new Set(["/", "/citizen-feed", "/projects", "/my-feedbacks", "/my-issues", "/report-issue", "/contact"]);
const subscribeToHydration = () => () => {};

export function CitizenGuides() {
  // Auth and guide progress may already be cached on the client. Keep this
  // boundary empty on the server and during hydration, then show the panel.
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  return hydrated ? <CitizenGuidesPanel /> : null;
}

export function CitizenGuidesPanel() {
  const context = useCitizenGuide();
  const pathname = usePathname();
  if (!context || !locations.has(pathname)) return null;
  const allCompleted = CITIZEN_GUIDES.every((guide) => context.progress?.seen[tourKey(guide.id)] === "completed");
  if (allCompleted && !context.active) return null;
  return <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
    <details data-tour="citizen-guides" className="group mb-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-900 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <span className="font-heading text-lg font-semibold">Citizen guides</span>
          <span className="text-sm text-slate-600 dark:text-slate-300">Help with feedback, reports, and inquiries.</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-200 px-4 dark:border-slate-800">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {CITIZEN_GUIDES.map((guide) => {
            const completed = context.progress?.seen[tourKey(guide.id)] === "completed";
            const action = completed ? "Review guide" : "Open guide";
            return <li key={guide.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <div>
                <h3 className="text-sm font-semibold">{guide.title}</h3>
                {completed ? <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">Completed</p> : null}
              </div>
              <p className="col-start-1 row-start-2 text-sm text-slate-600 sm:col-start-2 sm:row-start-1 dark:text-slate-300">{guide.description}</p>
              <button type="button" disabled={context.active || context.loading} onClick={() => context.start(guide.id)} aria-label={`${action}: ${guide.title}`} className="col-start-2 row-span-2 row-start-1 min-h-11 rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 sm:col-start-3 sm:row-span-1">{action}</button>
            </li>;
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-slate-200 py-2 dark:border-slate-800">
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Example data only. No messages or reports are submitted.</p>
          <button type="button" disabled={context.active} onClick={context.overview} className="min-h-11 rounded-md px-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">View feature tour</button>
        </div>
      </div>
    </details>
  </div>;
}
