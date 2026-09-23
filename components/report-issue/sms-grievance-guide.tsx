"use client";

import { Check, Copy, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SmsPhoneMockup } from "@/components/report-issue/sms-phone-mockup";

const SMS_TEMPLATE = "Project Type\nName of Sender (Optional)\nAge\nGender\nLocation\n\nConcern";
const OFFICIAL_NUMBER = "0912-345-6789";
const EXAMPLE_TICKET_ID = "BAFE-2026-000842";
const TICKET_PLACEHOLDER = "{{TICKET_ID}}";

export const SMS_GUIDANCE_COPY = {
  en: {
    language: "English",
    title: "SMS Grievance Guide",
    intro: "Use this format to send an SMS grievance from your own phone.",
    exampleNote: "Your name is optional — you can leave it blank if you prefer not to share it.",
    trackingNote: "Once SMS reporting goes live, an automatic reply will confirm a ticket number for your report. Keep it to follow up later.",
    sampleLabel: "Sample conversation",
    sample: "Solar-Powered Irrigation Pump\nJuan Dela Cruz\n45\nMale\nBrgy. San Isidro, Pili, Camarines Sur\n\nThe solar-powered water pump has been broken for three weeks, and our rice field has dried up.",
    autoReply: `Good day! Thank you for your report. We've logged your report under ticket No. ${TICKET_PLACEHOLDER}. Our Team will review and provide a response as soon as possible. To help us resolve this as fast as possible, please reply with the following information:\n1. Project Type\n2. Name of Sender (optional)\n3. Age\n4. Gender\n5. Location\nThank you.`,
    includeTitle: "Information to include",
    include: ["Project type", "Your name (optional)", "Age", "Gender", "Location", "A clear description of the infrastructure concern"],
    acceptedTitle: "Concern examples",
    accepted: ["Example: delayed or stopped infrastructure work", "Example: damage, construction quality, safety, drainage, or blocked access", "Example: project information, procurement, payment, supplier, or misconduct concerns"],
    privacy: "Leaving the name field blank hides your identity from ordinary staff views. Your phone number may still be visible to the telecommunications or SMS provider handling the message.",
    emergency: "This is not an emergency service. Use the appropriate official emergency channel if there is immediate danger.",
    attachments: "Do not send passwords, private documents, or attachments. SMS cannot carry file attachments.",
    online: "Use the Online E-Report instead",
    copy: "Copy template",
    copied: "Template copied",
    copyFailed: "Copying is unavailable. Select and copy the template manually.",
    copyNumber: "Copy number",
    numberCopied: "Number copied",
  },
  tl: {
    language: "Filipino",
    title: "Gabay sa SMS Grievance",
    intro: "Gamitin ang format na ito para magpadala ng SMS grievance mula sa sarili mong telepono.",
    exampleNote: "Opsyonal ang iyong pangalan — puwede itong iwanang blangko kung ayaw mong ipakilala.",
    trackingNote: "Kapag aktibo na ang SMS reporting, may awtomatikong sagot na magbibigay ng ticket number para sa iyong ulat. Itago ito para masundan ito sa susunod.",
    sampleLabel: "Halimbawang usapan",
    sample: "Solar-Powered Irrigation Pump\nJuan Dela Cruz\n45\nLalaki\nBrgy. San Isidro, Pili, Camarines Sur\n\nTatlong linggo nang sira ang solar-powered na water pump namin, at natutuyo na ang palayan namin.",
    autoReply: `Magandang araw! Maraming salamat sa inyong ulat. Itinala namin ito sa ilalim ng Ticket Blg. ${TICKET_PLACEHOLDER}. Susuriin ito ng aming pangkat at tutugon sa lalong madaling panahon.\nUpang matulungan kaming maresolba ito agad, mangyaring ibigay ang sumusunod na mga impormasyon:\n1. Uri ng Proyekto\n2. Pangalan ng Nagpadala (opsyonal)\n3. Edad\n4. Kasarian\n5. Lokasyon\nMaraming salamat.`,
    includeTitle: "Impormasyong kailangang ilagay",
    include: ["Uri ng proyekto", "Iyong pangalan (opsyonal)", "Edad", "Kasarian", "Lokasyon", "Malinaw na paglalarawan ng reklamo sa imprastraktura"],
    acceptedTitle: "Mga halimbawang concern",
    accepted: ["Halimbawa: naantala o tumigil na gawaing imprastraktura", "Halimbawa: pinsala, kalidad ng konstruksyon, kaligtasan, drainage, o nakaharang na daan", "Halimbawa: impormasyon ng proyekto, procurement, bayad, supplier, o concern tungkol sa maling gawain"],
    privacy: "Kapag iniwan mong blangko ang pangalan, itinatago ang iyong pagkakakilanlan sa karaniwang staff view. Maaaring maproseso pa rin ng telecommunications o SMS provider ang iyong numero.",
    emergency: "Hindi ito serbisyong pang-emergency. Gamitin ang naaangkop na opisyal na emergency channel kung may agarang panganib.",
    attachments: "Huwag magpadala ng password, pribadong dokumento, o attachment. Hindi maaaring magdala ng attachment ang SMS.",
    online: "Gamitin ang Online E-Report",
    copy: "Kopyahin ang template",
    copied: "Nakopya ang template",
    copyFailed: "Hindi available ang pagkopya. Piliin at kopyahin nang manu-mano ang template.",
    copyNumber: "Kopyahin ang numero",
    numberCopied: "Nakopya ang numero",
  },
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
          <div className="border-l-4 border-orange-600 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
            UI prototype. The official number and SMS API are not connected. No message will be sent from this page.
          </div>
          <h1 className="mt-7 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">{copy.intro}</p>

          <div className="mt-6 inline-flex rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" aria-label="Instruction language">
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
            <h2 id="sms-number-title" className="font-heading text-xl font-semibold">Official SMS destination</h2>
            <div className="mt-3 border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xl font-bold tracking-wide break-all">{OFFICIAL_NUMBER}</p>
                <Button type="button" variant="outline" onClick={copyNumber} className="min-h-11 w-fit px-4">
                  {numberCopyState === "copied" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                  {numberCopyState === "copied" ? copy.numberCopied : copy.copyNumber}
                </Button>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Send your SMS grievance to this number using the format below.</p>
            </div>
          </section>

          <section aria-labelledby="sms-format-title">
            <h2 id="sms-format-title" className="font-heading text-xl font-semibold">Message format</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Write each part on its own line so staff can review it clearly.</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.exampleNote}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.trackingNote}</p>

            <div className="mt-4 border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="min-w-0 max-w-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Template</span>
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
                <SmsPhoneMockup
                  contactName="INFRAWATCH"
                  label={copy.sampleLabel}
                  message={copy.sample}
                  reply={copy.autoReply.replace(TICKET_PLACEHOLDER, EXAMPLE_TICKET_ID)}
                />
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
            <h2 className="mt-3 font-heading text-lg font-semibold">Privacy and safety</h2>
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
            Back to reported issues
          </Link>
        </aside>
      </div>
    </div>
  );
}
