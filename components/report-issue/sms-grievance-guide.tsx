"use client";

import { Check, Copy, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SmsPhoneMockup } from "@/components/report-issue/sms-phone-mockup";
import { eReport } from "@/i18n/sections/eReport";

const SMS_TEMPLATE = "Project Type\nName of Sender (Optional)\nAge\nGender\nLocation\n\nConcern";
const OFFICIAL_NUMBER = "0912-345-6789";
const EXAMPLE_TICKET_ID = "BAFE-2026-000842";
const TICKET_PLACEHOLDER = "{{TICKET_ID}}";

// The guide has its own English/Filipino switch (it starts in the site language, see
// app/(public)/report-issue/sms/page.tsx), so it reads both copies of eReport.smsGuide directly.
export const SMS_GUIDANCE_COPY = {
  en: eReport.en.smsGuide,
  tl: eReport.tl.smsGuide,
} as const;

type SmsGuideLanguage = keyof typeof SMS_GUIDANCE_COPY;

export function SmsGrievanceGuide({ initialLanguage = "en" }: { initialLanguage?: SmsGuideLanguage }) {
  const [language, setLanguage] = useState<SmsGuideLanguage>(initialLanguage);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [numberCopyState, setNumberCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = SMS_GUIDANCE_COPY[language];

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(SMS_TEMPLATE);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(OFFICIAL_NUMBER);
      setNumberCopyState("copied");
    } catch {
      setNumberCopyState("failed");
    }
  };

  return (
    <div lang={language === "tl" ? "fil" : "en"} className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div data-citizen="sms-notice" className="border-l-4 border-orange-600 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
            {copy.prototypeNotice}
          </div>
          <h1 className="mt-7 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">{copy.intro}</p>

          <div className="mt-6 inline-flex rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" aria-label={copy.languageLabel}>
            {(["en", "tl"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLanguage(value);
                  setCopyState("idle");
                }}
                aria-pressed={language === value}
                className={`min-h-11 rounded-md border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${language === value ? "border-primary bg-primary text-white" : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"}`}
              >
                {SMS_GUIDANCE_COPY[value].language}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 lg:px-8 lg:pt-12 lg:pb-20">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="sms-number-title">
            <h2 id="sms-number-title" className="font-heading text-xl font-semibold">{copy.destinationTitle}</h2>
            <div className="mt-3 border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xl font-bold tracking-wide break-all">{OFFICIAL_NUMBER}</p>
                <Button type="button" variant="outline" onClick={copyNumber} className="min-h-11 w-fit px-4">
                  {numberCopyState === "copied" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {numberCopyState === "copied" ? copy.numberCopied : copy.copyNumber}
                </Button>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.destinationHelp}</p>
            </div>
          </section>

          <section aria-labelledby="sms-format-title">
            <h2 id="sms-format-title" className="font-heading text-xl font-semibold">{copy.formatTitle}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.formatHelp}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.exampleNote}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.trackingNote}</p>

            <div className="mt-4 border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="min-w-0 max-w-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{copy.templateLabel}</span>
                    <Button type="button" variant="outline" onClick={copyTemplate} className="min-h-11 w-fit px-4">
                      {copyState === "copied" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                      {copyState === "copied" ? copy.copied : copy.copy}
                    </Button>
                  </div>
                  <code className="mt-3 block [overflow-wrap:anywhere] whitespace-pre-line border border-slate-200 bg-slate-50 p-5 font-mono text-sm leading-7 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
                    {SMS_TEMPLATE}
                  </code>
                  <p className="mt-2 min-h-6 text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
                    {copyState === "failed" ? copy.copyFailed : copyState === "copied" ? copy.copied : ""}
                  </p>
                </div>
                <div data-citizen="sms-conversation"><SmsPhoneMockup
                  contactName="INFRAWATCH"
                  label={copy.sampleLabel}
                  message={copy.sample}
                  reply={copy.autoReply.replace(TICKET_PLACEHOLDER, EXAMPLE_TICKET_ID)}
                /></div>
              </div>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="font-heading text-xl font-semibold">{copy.includeTitle}</h2>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {copy.include.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold">{copy.acceptedTitle}</h2>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {copy.accepted.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <ShieldAlert aria-hidden="true" className="size-5 text-orange-700 dark:text-orange-300" />
            <h2 className="mt-3 font-heading text-lg font-semibold">{copy.privacyTitle}</h2>
            <div className="mt-4 space-y-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <p>{copy.privacy}</p>
              <p>{copy.emergency}</p>
              <p>{copy.attachments}</p>
            </div>
          </div>

          <Button asChild variant="outline" className="min-h-11 w-full px-4">
            <Link href="/report-issue/new"><FileText aria-hidden="true" className="size-4" />{copy.online}</Link>
          </Button>
          <Link href="/report-issue" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {copy.backToList}
          </Link>
        </aside>
      </div>
    </div>
  );
}
