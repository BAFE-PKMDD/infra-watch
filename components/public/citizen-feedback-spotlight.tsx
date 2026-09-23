"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, User } from "lucide-react";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";

function timeAgo(date: Date | string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function CitizenFeedbackSpotlight({ items }: { items: FeedbackActivityItem[] }) {
  const usable = useMemo(
    () => items.filter((item) => item.comment && item.comment.trim().length > 0),
    [items],
  );

  const spotlight = useMemo(() => {
    const ranked = [...usable].sort((a, b) => {
      const scoreA = (a.rating ?? 0) * 10 + a.comment.length / 20;
      const scoreB = (b.rating ?? 0) * 10 + b.comment.length / 20;
      return scoreB - scoreA;
    });
    return ranked.slice(0, 4);
  }, [usable]);

  const grid = useMemo(() => usable.slice(0, 9), [usable]);

  const [activeId, setActiveId] = useState<string | null>(spotlight[0]?.id ?? null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (spotlight.length < 2 || reduceMotion) return;

    const interval = setInterval(() => {
      setActiveId((current) => {
        const currentIndex = spotlight.findIndex((item) => item.id === current);
        const next = spotlight[(currentIndex + 1) % spotlight.length];
        return next.id;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [spotlight, reduceMotion]);

  if (spotlight.length < 1) return null;

  const active = spotlight.find((item) => item.id === activeId) ?? spotlight[0];
  const activeName = active.isAnonymous ? "Anonymous User" : active.user?.name || "Citizen";

  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-slate-50 px-4 py-16 dark:border-slate-800 dark:bg-slate-950/60 md:py-28">
      <motion.div
        className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 flex items-center justify-center gap-3">
          <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-amber-600 dark:text-amber-400">
            Citizen Feed
          </span>
          <span aria-hidden className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Reported by Citizens
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Comments submitted by citizens on monitored projects, pulled directly from the Citizen Feed.
        </p>
      </motion.div>

      <motion.div
        className="relative mx-auto max-w-5xl"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Decorative wall of real feedback, faded behind the spotlight card */}
        {grid.length >= 3 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden grid-cols-3 gap-3 opacity-70 sm:grid [mask-image:radial-gradient(ellipse_58%_58%_at_center,transparent_38%,black_85%)] dark:opacity-40"
          >
            {grid.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="line-clamp-3 text-xs leading-relaxed text-slate-400 dark:text-slate-600">
                  {item.comment}
                </p>
                <p className="mt-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600">
                  {item.isAnonymous ? "Anonymous User" : item.user?.name || "Citizen"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Spotlight report card */}
        <div className="relative z-10 mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="p-6 text-left sm:p-7"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-900">
                  {!active.isAnonymous && active.user?.image ? (
                    <Image
                      src={active.user.image}
                      alt={activeName}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : !active.isAnonymous && active.user ? (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary dark:bg-indigo-950 dark:text-indigo-300">
                      <span className="text-xs font-bold">{getInitials(activeName)}</span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                      <User className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{activeName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="whitespace-nowrap">{timeAgo(active.createdAt)}</span>
                    {active.project?.name && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                          <span className="truncate">{active.project.name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {truncate(active.comment, 240)}
              </p>
            </motion.div>
          </AnimatePresence>

          {spotlight.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-7">
              {spotlight.map((item) => {
                const name = item.isAnonymous ? "Anonymous User" : item.user?.name || "Citizen";
                const isActive = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    aria-pressed={isActive}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                      isActive
                        ? "bg-slate-900 text-white dark:bg-primary"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
