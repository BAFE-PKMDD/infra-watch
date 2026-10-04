"use client";

import { createContext, useContext } from "react";
import type { CitizenGuideId } from "@/lib/tours/citizen";
import type { TourProgress } from "@/lib/tours/progress";

export type CitizenGuideSession = { id: string; guide: CitizenGuideId; returnTo: string; submitted: boolean };
export const CitizenGuideContext = createContext<{
  session: CitizenGuideSession | null;
  progress?: TourProgress;
  loading: boolean;
  active: boolean;
  start: (id: CitizenGuideId) => void;
  overview: () => void;
  submitted: (kind: CitizenGuideId) => void;
} | null>(null);
export const useCitizenGuide = () => useContext(CitizenGuideContext);

export function CitizenGuideNotice() {
  const guide = useCitizenGuide();
  if (!guide?.session) return null;
  return <p role="status" className="mb-4 rounded-md border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-slate-800 dark:text-slate-100">Guide mode · Example data only. Nothing is sent or saved.</p>;
}

export function CitizenGuideReceipt() {
  return <section data-citizen="receipt" role="status" className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
    <h2 className="font-heading text-xl font-semibold">Example complete</h2>
    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">You have reviewed the submission process. No record was created and no message was sent.</p>
  </section>;
}
