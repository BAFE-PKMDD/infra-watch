"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";
import { CitizenFeedbackBubbles } from "./citizen-feedback-bubbles";

export function CitizenFeedbackSpotlight({ items }: { items: FeedbackActivityItem[] }) {
  const usable = useMemo(
    () => items.filter((item) => item.comment && item.comment.trim().length > 0),
    [items],
  );

  if (usable.length < 1) return null;

  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-slate-50 px-4 py-16 dark:border-slate-800 dark:bg-slate-950/60 md:py-28">
      <motion.div
        className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Reported by Citizens
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Comments submitted by citizens on monitored projects, pulled directly from the Citizen Feed.
        </p>
      </motion.div>

      <motion.div
        className="mx-auto max-w-5xl"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <CitizenFeedbackBubbles items={usable} />
      </motion.div>

      <div className="relative z-10 mt-10 text-center">
        <Link
          href="/citizen-feed"
          className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-indigo-300"
        >
          <span>View Citizen Feed</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
