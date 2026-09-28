"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText, MessageSquareText, Rss, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

type Channel = {
  id: "citizen-feed" | "online-report" | "sms-grievance";
  /** Key under landing.channels for the purpose, best-for, CTA and step copy. */
  key: "citizenFeed" | "onlineReport" | "smsGrievance";
  /** Channel name; a product name, so it stays the same in every language. */
  label: string;
  icon: LucideIcon;
  /** Keys under landing.channels.<key>.steps, in display order. */
  steps: string[];
  href: string;
};

const CHANNELS: Channel[] = [
  {
    id: "citizen-feed",
    key: "citizenFeed",
    label: "Citizen Feed",
    icon: Rss,
    steps: ["find", "post", "public"],
    href: "/citizen-feed",
  },
  {
    id: "online-report",
    key: "onlineReport",
    label: "Online E-Report",
    icon: FileText,
    steps: ["identify", "describe", "submit"],
    href: "/report-issue/new",
  },
  {
    id: "sms-grievance",
    key: "smsGrievance",
    label: "SMS Grievance",
    icon: MessageSquareText,
    steps: ["send", "ticket", "review"],
    href: "/report-issue/sms",
  },
];

export function ReportingChannelsHowItWorks() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<Channel["id"]>(CHANNELS[0].id);
  const reduceMotion = useReducedMotion();
  const active = CHANNELS.find((channel) => channel.id === activeId) ?? CHANNELS[0];

  return (
    <section
      id="reporting-channels"
      aria-labelledby="reporting-channels-title"
      className="scroll-mt-20 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="reporting-channels-title"
            className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
          >
            {t("landing.channels.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t("landing.channels.description")}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={t("landing.channels.tablistLabel")}
          className="mx-auto mt-8 flex max-w-xl flex-col gap-2 sm:flex-row sm:rounded-xl sm:border sm:border-slate-200 sm:bg-slate-50 sm:p-1 dark:sm:border-slate-800 dark:sm:bg-slate-900"
        >
          {CHANNELS.map((channel) => {
            const isActive = channel.id === activeId;
            return (
              <button
                key={channel.id}
                type="button"
                role="tab"
                id={`tab-${channel.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${channel.id}`}
                onClick={() => setActiveId(channel.id)}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 sm:border-transparent sm:bg-transparent"
                )}
              >
                <channel.icon className="h-4 w-4" aria-hidden />
                {channel.label}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <motion.div
            key={active.id}
            id={`panel-${active.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${active.id}`}
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60 md:p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-primary bg-white text-primary dark:bg-slate-950 dark:text-indigo-300">
                  <active.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(`landing.channels.${active.key}.purpose`)}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t(`landing.channels.${active.key}.bestFor`)}
                </p>
              </div>
              <Button asChild className="h-auto min-h-11 shrink-0 whitespace-normal px-5 py-2 text-center">
                <Link href={active.href}>
                  {t(`landing.channels.${active.key}.cta`)}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {active.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-xs font-bold text-white dark:bg-indigo-500">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t(`landing.channels.${active.key}.steps.${step}.title`)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {t(`landing.channels.${active.key}.steps.${step}.description`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
