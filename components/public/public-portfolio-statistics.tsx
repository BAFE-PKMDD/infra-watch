"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function CountUp({
  value,
  format,
  duration = 2.2,
  delay = 0,
  onComplete,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
  onComplete?: () => void;
}) {
  const finalText = format(value);
  // SSR/no-JS renders the real final value. On mount we immediately drop to the
  // formatted zero (before the reveal delay below) so the later count-up doesn't
  // visibly "reset" from the final figure once the delay elapses.
  const [display, setDisplay] = useState(finalText);

  useEffect(() => {
    if (value === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onComplete?.();
      return;
    }

    let cancelled = false;
    let frame = 0;
    let startTime: number | null = null;
    let didReset = false;
    const totalMs = duration * 1000;
    const delayMs = delay * 1000;

    const step = (timestamp: number) => {
      if (cancelled) return;
      if (startTime === null) startTime = timestamp;
      if (!didReset) {
        didReset = true;
        setDisplay(format(0));
      }
      const elapsed = timestamp - startTime - delayMs;
      if (elapsed < 0) {
        frame = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / totalMs, 1);
      setDisplay(format(value * easeOutQuart(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        onComplete?.();
      }
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}

function StatCard({
  label,
  numeric,
  format,
  delay,
}: {
  label: string;
  numeric: number;
  format: (value: number) => string;
  delay: number;
}) {
  const [settled, setSettled] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-3 py-5 text-center shadow-md sm:px-4">
      <motion.p
        className="text-2xl font-extrabold tabular-nums text-white md:text-3xl lg:text-4xl"
        animate={!reduceMotion && settled ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <CountUp value={numeric} format={format} delay={delay} onComplete={() => setSettled(true)} />
      </motion.p>
      <p className="text-[11px] font-bold uppercase leading-snug tracking-wide text-white/95 sm:text-xs md:text-sm md:tracking-wider">{label}</p>
    </div>
  );
}

export function PublicPortfolioStatistics({
  result,
  countStartDelay = 0,
}: {
  result: InfraAnalyticsResult;
  /** Seconds to wait before counting starts, so it stays hidden behind a parent fade-in instead of finishing before anyone can see it. */
  countStartDelay?: number;
}) {
  if (result.status !== "ready" || !result.data) {
    return (
      <div className="rounded-xl border border-white/20 bg-slate-950/40 p-5 text-center text-sm font-semibold text-white backdrop-blur-md" role={result.status === "unavailable" ? "alert" : "status"}>
        {result.status === "empty"
          ? "No synchronized infrastructure statistics are available yet."
          : "Statistics temporarily unavailable. No estimated or reference figures are being shown."}
      </div>
    );
  }

  const { data } = result;
  const stats = [
    {
      label: "Total Investment",
      numeric: data.summary.approvedBudget,
      format: (value: number) => formatCurrencyCompact(value),
    },
    {
      label: "Total Projects",
      numeric: data.totalTarget,
      format: (value: number) => formatNumber(Math.round(value)),
    },
    {
      label: "Completed Projects",
      numeric: data.summary.completedOrTurnedOver.percentage,
      format: (value: number) => `${value.toFixed(2)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          numeric={stat.numeric}
          format={stat.format}
          delay={countStartDelay + index * 0.15}
        />
      ))}
    </div>
  );
}
