"use client";

import { useEffect, useState } from "react";
import type { InfraAnalyticsResult } from "@/actions/query/analytics.query";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function CountUp({
  value,
  format,
  duration = 2,
  delay = 0,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
}) {
  const finalText = format(value);
  const [display, setDisplay] = useState(finalText);

  useEffect(() => {
    if (value === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let frame = 0;
    let startTime: number | null = null;
    const totalMs = duration * 1000;
    const delayMs = delay * 1000;

    const step = (timestamp: number) => {
      if (cancelled) return;
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime - delayMs;
      if (elapsed < 0) {
        frame = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / totalMs, 1);
      setDisplay(format(value * easeOutQuart(progress)));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
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

export function PublicPortfolioStatistics({ result }: { result: InfraAnalyticsResult }) {
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
      label: "Approved budget",
      description: `${formatNumber(data.summary.budgetCoverage.available)} of ${formatNumber(data.summary.budgetCoverage.total)} projects have approved-budget data`,
      numeric: data.summary.approvedBudget,
      format: (value: number) => formatCurrencyCompact(value),
    },
    {
      label: "Projects monitored",
      description: data.scopeLabel,
      numeric: data.totalTarget,
      format: (value: number) => formatNumber(Math.round(value)),
    },
    {
      label: "Completed or turned over",
      description: `${formatNumber(data.summary.completedOrTurnedOver.count)} of ${formatNumber(data.summary.completedOrTurnedOver.total)} projects`,
      numeric: data.summary.completedOrTurnedOver.percentage,
      format: (value: number) => `${value.toFixed(2)}%`,
    },
    {
      label: "Projects mapped",
      description: `Only projects with valid source coordinates · ${formatNumber(data.summary.mappedProjects.total)} total`,
      numeric: data.summary.mappedProjects.count,
      format: (value: number) => formatNumber(Math.round(value)),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className="min-h-32 rounded-xl border border-white/15 bg-white/[0.18] px-3 py-4 text-center shadow-xl backdrop-blur-md sm:px-4 sm:py-5">
            <p className="text-xl font-extrabold tabular-nums text-white drop-shadow-lg md:text-2xl lg:text-3xl">
              <CountUp value={stat.numeric} format={stat.format} delay={index * 0.15} />
            </p>
            <p className="mt-3 text-[11px] font-bold uppercase leading-snug tracking-wide text-white/95 sm:text-xs md:text-sm md:tracking-wider">{stat.label}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/75">{stat.description}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] font-medium text-white/80">
        Source: {data.source.name} · Last successful sync: {data.source.lastSuccessfulSync}
      </p>
    </div>
  );
}
