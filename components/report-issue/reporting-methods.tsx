"use client";

import { FileText, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export function ReportingMethods() {
  const { t } = useTranslation();

  return (
    <section id="reporting-methods" aria-labelledby="reporting-methods-title" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 id="reporting-methods-title" className="font-heading text-2xl font-bold text-slate-950 dark:text-white">
            {t("eReport.methods.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {t("eReport.methods.intro")}
          </p>
        </div>

        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          <div className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 gap-3">
              <FileText aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">{t("eReport.methods.onlineTitle")}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t("eReport.methods.onlineBody")}
                </p>
              </div>
            </div>
            <Button asChild className="min-h-11 w-full px-4 md:w-auto">
              <Link href="/report-issue/new">{t("eReport.methods.onlineCta")}</Link>
            </Button>
          </div>

          <div className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 gap-3">
              <MessageSquareText aria-hidden="true" className="mt-1 size-5 shrink-0 text-orange-700 dark:text-orange-300" />
              <div>
                <h3 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">{t("eReport.methods.smsTitle")}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t("eReport.methods.smsBody")}
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="min-h-11 w-full border-primary px-4 text-primary md:w-auto">
              <Link href="/report-issue/sms">{t("eReport.methods.smsCta")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
