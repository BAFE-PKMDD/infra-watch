"use client";

import { createContext, useContext } from "react";
import { CircleHelp } from "lucide-react";
import type { TaskTutorial } from "@/lib/tours/tutorials";
import type { TourProgress } from "@/lib/tours/progress";

export const TourContext = createContext<{
  start: (overview: boolean) => void;
  hasPageTour: boolean;
  learning?: { lessons: TaskTutorial[]; progress?: TourProgress; loading: boolean; active: boolean; homePath?: string; startLesson: (lesson: TaskTutorial) => void };
} | null>(null);

export function TourLauncher({ overview = false }: { overview?: boolean }) {
  const context = useContext(TourContext);
  if (!context || (!overview && !context.hasPageTour)) return null;
  return <button type="button" data-tour-launcher="" onClick={() => context.start(overview)}
    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 print:hidden">
    <CircleHelp aria-hidden="true" className="size-4" />{overview ? "Tutorials" : "Take a tour"}
  </button>;
}
