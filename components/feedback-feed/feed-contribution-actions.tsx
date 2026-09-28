"use client";

import Link from "next/link";
import { AlertTriangle, MessageSquarePlus, PenLine } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";

export function FeedContributionActions() {
  const { t } = useTranslation();

  return (
    <section aria-label={t("community.contribute.sectionLabel")} className="mb-6">
      <Dialog>
        <DialogTrigger
          render={
            <button
              type="button"
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-primary/50 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-[#0d1526] dark:hover:border-indigo-500/60 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950"
            />
          }
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <PenLine aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-950 dark:text-white">
              {t("community.contribute.writePost")}
            </span>
            <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">
              {t("community.contribute.writePostHint")}
            </span>
          </span>
        </DialogTrigger>

        <DialogContent className="gap-0 overflow-hidden bg-white p-0 dark:bg-[#0d1526] sm:max-w-md">
          <DialogHeader className="border-b border-slate-200 px-5 py-5 pr-12 text-left dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-950 dark:text-white">
              {t("community.contribute.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="leading-6 text-slate-600 dark:text-slate-300">
              {t("community.contribute.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4 sm:p-5">
            <Link
              href="/projects"
              className="flex min-h-20 items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:hover:border-indigo-400 dark:hover:bg-indigo-950/20"
            >
              <MessageSquarePlus
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary dark:text-indigo-300"
              />
              <span>
                <span className="block text-sm font-bold text-slate-950 dark:text-white">
                  {t("community.contribute.feedbackTitle")}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {t("community.contribute.feedbackBody")}
                </span>
              </span>
            </Link>

            <Link
              href="/report-issue/new"
              className="flex min-h-20 items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-amber-600 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-slate-700 dark:hover:border-amber-400 dark:hover:bg-amber-950/20"
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400"
              />
              <span>
                <span className="block text-sm font-bold text-slate-950 dark:text-white">
                  {t("community.contribute.reportTitle")}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {t("community.contribute.reportBody")}
                </span>
              </span>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
