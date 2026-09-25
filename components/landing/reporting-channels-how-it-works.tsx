"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText, MessageSquareText, Rss, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChannelStep = {
  title: string;
  desc: string;
};

type Channel = {
  id: "citizen-feed" | "online-report" | "sms-grievance";
  label: string;
  icon: LucideIcon;
  purpose: string;
  bestFor: string;
  steps: ChannelStep[];
  cta: { label: string; href: string };
};

const CHANNELS: Channel[] = [
  {
    id: "citizen-feed",
    label: "Citizen Feed",
    icon: Rss,
    purpose: "A public feed for quick, visible feedback that other citizens and moderators can see right away.",
    bestFor: "Best for a rating, a geotagged photo, or an observation on a project you're currently looking at.",
    steps: [
      { title: "Find the project", desc: "Search or select the project you want to comment on." },
      { title: "Post your observation", desc: "Rate it, tag a category, and attach geotagged photos or video." },
      { title: "Goes public", desc: "Your post appears on the feed for other citizens and moderators to see." },
    ],
    cta: { label: "Open Citizen Feed", href: "/citizen-feed" },
  },
  {
    id: "online-report",
    label: "Online E-Report",
    icon: FileText,
    purpose: "A structured form for a specific problem that needs a written record and a moderator response.",
    bestFor: "Best for delays, quality defects, safety hazards, or anything that needs formal follow-up.",
    steps: [
      { title: "Identify the project", desc: "Search for it by name, or describe it if you don't know which one it is." },
      { title: "Describe the issue", desc: "Select an issue type, add details, and upload evidence." },
      { title: "Add contact info & submit", desc: "Confirm your details and review before submitting for a tracked ticket." },
    ],
    cta: { label: "Open Online E-Report", href: "/report-issue/new" },
  },
  {
    id: "sms-grievance",
    label: "SMS Grievance",
    icon: MessageSquareText,
    purpose: "A text-message channel for reporting without data or an internet connection.",
    bestFor: "Best for areas with weak signal, or citizens without a smartphone or mobile data.",
    steps: [
      { title: "Send the SMS", desc: "Text the official number using the required format: project type, name (optional), age, gender, location, concern." },
      { title: "Get a ticket number", desc: "An automatic reply confirms your report and gives you a ticket number to track." },
      { title: "Moderator review", desc: "Government moderators review submitted grievances and follow up." },
    ],
    cta: { label: "View SMS Instructions", href: "/report-issue/sms" },
  },
];

export function ReportingChannelsHowItWorks() {
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
            How Each Reporting Channel Works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Citizen Feed, Online E-Report, and SMS Grievance serve different purposes. Pick the one that fits what
            you need to say.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Reporting channel"
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
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{active.purpose}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{active.bestFor}</p>
              </div>
              <Button asChild className="min-h-11 shrink-0 px-5">
                <Link href={active.cta.href}>
                  {active.cta.label}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {active.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-xs font-bold text-white dark:bg-indigo-500">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{step.desc}</p>
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
