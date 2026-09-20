"use client";

import { Check, Copy, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const SMS_TEMPLATE = "INFRAWATCH | ANON or NAME | PROJECT/LOCATION | CONCERN";
const OFFICIAL_NUMBER = "[OFFICIAL SMS NUMBER]";

export const SMS_GUIDANCE_COPY = {
  en: {
    language: "English",
    title: "SMS Grievance Guide",
    intro: "Use this format when the official SMS service becomes available. Send the message from your own phone.",
    anonymous: "Anonymous format",
    anonymousExample: "INFRAWATCH | ANON | [PROJECT OR LOCATION] | [DESCRIBE THE CONCERN]",
    identified: "Identified format",
    identifiedExample: "INFRAWATCH | [FULL NAME] | [PROJECT OR LOCATION] | [DESCRIBE THE CONCERN]",
    includeTitle: "Information to include",
    include: ["INFRAWATCH keyword", "ANON or your name", "Project name or location", "A clear description of the infrastructure concern"],
    acceptedTitle: "Prototype concern examples",
    accepted: ["Sample: delayed or stopped infrastructure work", "Sample: damage, construction quality, safety, drainage, or blocked access", "Sample: project information, procurement, payment, supplier, or misconduct concerns"],
    privacy: "Prototype design only: choosing ANON would hide the sender's name in ordinary staff views. This behavior is not active. A future telecommunications or SMS provider could still process the phone number.",
    emergency: "This prototype is not an emergency service. Use the appropriate official emergency channel when there is immediate danger.",
    attachments: "Do not send passwords, private documents, or attachments. No attachment-handling policy or SMS service is active in this prototype.",
    online: "Use the Online E-Report instead",
    copy: "Copy template",
    copied: "Template copied",
    copyFailed: "Copying is unavailable. Select and copy the template manually.",
  },
  tl: {
    language: "Filipino",
    title: "Gabay sa SMS Grievance",
    intro: "Gamitin ang format na ito kapag available na ang opisyal na SMS service. Ipadala ang mensahe mula sa sarili mong telepono.",
    anonymous: "Format na anonymous",
    anonymousExample: "INFRAWATCH | ANON | [PROYEKTO O LOKASYON] | [ILARAWAN ANG REKLAMO]",
    identified: "Format na may pangalan",
    identifiedExample: "INFRAWATCH | [BUONG PANGALAN] | [PROYEKTO O LOKASYON] | [ILARAWAN ANG REKLAMO]",
    includeTitle: "Impormasyong kailangang ilagay",
    include: ["Salitang INFRAWATCH", "ANON o iyong pangalan", "Pangalan ng proyekto o lokasyon", "Malinaw na paglalarawan ng reklamo sa imprastraktura"],
    acceptedTitle: "Mga halimbawang concern sa prototype",
    accepted: ["Halimbawa: naantala o tumigil na gawaing imprastraktura", "Halimbawa: pinsala, kalidad ng konstruksyon, kaligtasan, drainage, o nakaharang na daan", "Halimbawa: impormasyon ng proyekto, procurement, bayad, supplier, o concern tungkol sa maling gawain"],
    privacy: "Disenyo lamang ng prototype: itatago sana ng ANON ang pangalan ng sender sa karaniwang staff view. Hindi pa aktibo ang behavior na ito. Maaari pa ring maproseso ng future telecommunications o SMS provider ang numero.",
    emergency: "Hindi serbisyong pang-emergency ang prototype na ito. Gamitin ang naaangkop na opisyal na emergency channel kung may agarang panganib.",
    attachments: "Huwag magpadala ng password, pribadong dokumento, o attachment. Walang aktibong attachment policy o SMS service sa prototype na ito.",
    online: "Gamitin ang Online E-Report",
    copy: "Kopyahin ang template",
    copied: "Nakopya ang template",
    copyFailed: "Hindi available ang pagkopya. Piliin at kopyahin nang manu-mano ang template.",
  },
} as const;

type SmsGuideLanguage = keyof typeof SMS_GUIDANCE_COPY;

export function SmsGrievanceGuide({ initialLanguage = "en" }: { initialLanguage?: SmsGuideLanguage }) {
  const [language, setLanguage] = useState<SmsGuideLanguage>(initialLanguage);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = SMS_GUIDANCE_COPY[language];

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(SMS_TEMPLATE);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div lang={language === "tl" ? "fil" : "en"} className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
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
                className={`min-h-11 rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${language === value ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
              >
                {SMS_GUIDANCE_COPY[value].language}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-8 lg:py-12">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="sms-number-title">
            <h2 id="sms-number-title" className="font-heading text-xl font-semibold">Official SMS destination</h2>
            <div className="mt-3 border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="font-mono text-base font-bold break-all">{OFFICIAL_NUMBER}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No SMS destination has been verified for this prototype.</p>
            </div>
          </section>

          <section aria-labelledby="sms-format-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="sms-format-title" className="font-heading text-xl font-semibold">Message format</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Keep the separators so staff can review each part.</p>
              </div>
              <Button type="button" variant="outline" onClick={copyTemplate} className="min-h-11 w-fit px-4">
                {copyState === "copied" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {copyState === "copied" ? copy.copied : copy.copy}
              </Button>
            </div>
            <code className="mt-3 block [overflow-wrap:anywhere] border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-6 text-white dark:border-slate-700">
              {SMS_TEMPLATE}
            </code>
            <p className="mt-2 min-h-6 text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
              {copyState === "failed" ? copy.copyFailed : copyState === "copied" ? `${copy.copied}. No message was sent.` : ""}
            </p>
          </section>

          <section aria-labelledby="sms-examples-title">
            <h2 id="sms-examples-title" className="font-heading text-xl font-semibold">Examples</h2>
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              <div className="py-4">
                <h3 className="font-semibold">{copy.anonymous}</h3>
                <p className="mt-2 break-words font-mono text-sm leading-6 text-slate-700 dark:text-slate-300">{copy.anonymousExample}</p>
              </div>
              <div className="py-4">
                <h3 className="font-semibold">{copy.identified}</h3>
                <p className="mt-2 break-words font-mono text-sm leading-6 text-slate-700 dark:text-slate-300">{copy.identifiedExample}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-heading text-xl font-semibold">{copy.includeTitle}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {copy.include.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold">{copy.acceptedTitle}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {copy.accepted.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <ShieldAlert aria-hidden="true" className="size-5 text-orange-700 dark:text-orange-300" />
            <h2 className="mt-3 font-heading text-lg font-semibold">Privacy and safety</h2>
            <div className="mt-3 space-y-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
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
