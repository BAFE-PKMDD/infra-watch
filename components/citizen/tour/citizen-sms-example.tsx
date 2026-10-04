"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n";
import { SmsGrievanceGuide } from "@/components/report-issue/sms-grievance-guide";
import { useCitizenGuide } from "./citizen-guide-context";

export default function CitizenSmsExample() {
  const guide = useCitizenGuide();
  const { language } = useTranslation();
  if (guide?.session?.guide !== "citizen-sms") return <div className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="font-heading text-2xl font-semibold">Open the SMS reporting guide</h1>
    <p className="mt-2 text-sm">Choose SMS reporting from Citizen guides to review the example message format and tracking instructions.</p>
    <Link href="/report-issue" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Return to E-Report</Link>
  </div>;
  return <SmsGrievanceGuide key={guide.session.id} initialLanguage={language} />;
}
