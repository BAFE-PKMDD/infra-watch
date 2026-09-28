"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Star, User, X } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";

type Translate = ReturnType<typeof useTranslation>["t"];

// --- Layout Presets for Speech Bubbles ---

const CARD_LAYOUTS = [
  { left: "3%", top: "6%", floatDuration: 4.8, floatDelay: 0 },
  { left: "53%", top: "8%", floatDuration: 5.4, floatDelay: 0.6 },
  { left: "28%", top: "36%", floatDuration: 4.4, floatDelay: 1.2 },
  { left: "4%", top: "64%", floatDuration: 5.2, floatDelay: 0.3 },
  { left: "54%", top: "62%", floatDuration: 4.9, floatDelay: 0.9 },
];

// --- helpers ---

function timeAgo(date: Date | string, t: Translate): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return t("landing.feedback.time.today");
  if (days === 1) return t("landing.feedback.time.yesterday");
  if (days < 7) return t("landing.feedback.time.daysAgo", { count: days });
  if (days < 30) return t("landing.feedback.time.weeksAgo", { count: Math.floor(days / 7) });
  return t("landing.feedback.time.monthsAgo", { count: Math.floor(days / 30) });
}

function authorName(item: FeedbackActivityItem, t: Translate): string {
  return item.isAnonymous ? t("landing.feedback.anonymous") : item.user?.name || t("landing.feedback.citizen");
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// --- ExpandedCard -------------------------------------------------------------

function ExpandedCard({
  item,
  onClose,
}: {
  item: FeedbackActivityItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const name = authorName(item, t);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7"
        initial={{ scale: 0.9, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t("landing.feedback.closeReport")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-primary/20 dark:ring-primary/30">
            {!item.isAnonymous && item.user?.image ? (
              <Image
                src={item.user.image}
                alt={name}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : !item.isAnonymous && item.user ? (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary dark:bg-indigo-950 dark:text-indigo-300">
                <span className="text-xs font-bold">{getInitials(name)}</span>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <User className="h-5 w-5" aria-hidden />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{name}</p>
              {item.isAnonymous && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t("landing.feedback.verifiedContributor")}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{timeAgo(item.createdAt, t)}</span>
              {typeof item.rating === "number" && item.rating > 0 && (
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={i < (item.rating ?? 0) ? "h-3 w-3 fill-amber-400 text-amber-400" : "h-3 w-3 text-slate-300 dark:text-slate-600"}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            &ldquo;{item.comment}&rdquo;
          </p>
        </div>

        {item.project && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-indigo-400" aria-hidden />
              <span className="truncate font-medium">{item.project.name}</span>
            </div>
            <Link
              href={item.project.id ? `/projects/${item.project.id}` : "/citizen-feed"}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline dark:text-indigo-400"
            >
              <span>{t("landing.feedback.viewDetails")}</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- Floating Speech Bubble Card ---

function SpeechBubbleCard({
  item,
  layout,
  containerRef,
  onExpand,
}: {
  item: FeedbackActivityItem;
  layout: (typeof CARD_LAYOUTS)[number];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onExpand: (id: string) => void;
}) {
  const { t } = useTranslation();
  const name = authorName(item, t);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      drag
      dragConstraints={containerRef}
      dragElastic={0.15}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setTimeout(() => setIsDragging(false), 100);
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -6, 0],
      }}
      transition={{
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
        y: {
          duration: layout.floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: layout.floatDelay,
        },
      }}
      whileHover={{ scale: 1.03, zIndex: 30 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        if (!isDragging) {
          onExpand(item.id);
        }
      }}
      style={{ left: layout.left, top: layout.top }}
      className="absolute z-10 w-72 cursor-grab active:cursor-grabbing select-none sm:w-80"
    >
      <div className="relative rounded-2xl rounded-bl-sm border border-slate-200/90 bg-white/95 p-3.5 shadow-md backdrop-blur-md transition-shadow hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-slate-950/40">
        {/* Author info + rating */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/20 dark:bg-indigo-950">
              {!item.isAnonymous && item.user?.image ? (
                <Image
                  src={item.user.image}
                  alt={name}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : !item.isAnonymous && item.user ? (
                <span className="text-[10px] font-bold text-primary dark:text-indigo-300">
                  {getInitials(name)}
                </span>
              ) : (
                <User className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{name}</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            {typeof item.rating === "number" && item.rating > 0 && (
              <div className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {item.rating}
                </span>
              </div>
            )}
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(item.createdAt, t)}</span>
          </div>
        </div>

        {/* Comment quote */}
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
          &ldquo;{item.comment}&rdquo;
        </p>

        {/* Project Tag */}
        {item.project?.name && (
          <div className="mt-2.5 flex items-center gap-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <MapPin className="h-2.5 w-2.5 flex-shrink-0 text-primary/70 dark:text-indigo-400" aria-hidden />
            <span className="truncate font-medium">{item.project.name}</span>
          </div>
        )}

        {/* Chat tail decorative indicator */}
        <span
          className="absolute -bottom-1 left-3 h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          aria-hidden
        />
      </div>
    </motion.div>
  );
}

// --- Main Component ---

export function CitizenFeedbackBubbles({ items }: { items: FeedbackActivityItem[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pick top 5 quality comments
  const featured = useMemo(() => {
    return items
      .filter((item) => Boolean(item.comment && item.comment.trim().length > 0))
      .sort((a, b) => (b.rating ?? 0) * 10 + b.comment.length / 20 - ((a.rating ?? 0) * 10 + a.comment.length / 20))
      .slice(0, 5);
  }, [items]);

  if (featured.length === 0) return null;

  // Reduced motion: static clean grid
  if (reduceMotion) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item) => {
          const name = authorName(item, t);
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{name}</p>
                <span className="text-[10px] text-slate-400">{timeAgo(item.createdAt, t)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-slate-600 dark:text-slate-300">
                &ldquo;{item.comment}&rdquo;
              </p>
              {item.project?.name && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="truncate">{item.project.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating Canvas */}
      <div
        ref={containerRef}
        className="relative h-[430px] w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/70 shadow-inner dark:border-slate-800 dark:bg-slate-950/40 sm:h-[450px]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Speech Bubble Cards */}
        {featured.map((item, idx) => (
          <SpeechBubbleCard
            key={item.id}
            item={item}
            layout={CARD_LAYOUTS[idx % CARD_LAYOUTS.length]}
            containerRef={containerRef}
            onExpand={setExpandedId}
          />
        ))}

        {/* Modal Overlay */}
        <AnimatePresence>
          {expandedId && (() => {
            const item = featured.find((i) => i.id === expandedId);
            return item ? (
              <ExpandedCard key={item.id} item={item} onClose={() => setExpandedId(null)} />
            ) : null;
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
