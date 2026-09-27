"use client";

import { useState, type MouseEvent } from "react";

export function formatEvidenceLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Approved/resolved reads as done, rejected as blocked, everything else (pending, submitted, ...) as awaiting review. */
export function getStatusDotClass(status: string) {
  if (status === "approved" || status === "resolved") return "bg-emerald-500";
  if (status === "rejected") return "bg-red-500";
  if (status === "reviewing" || status === "in-progress") return "bg-sky-500";
  if (status === "closed" || status === "suspended") return "bg-slate-400";
  return "bg-amber-500";
}

/**
 * Ticket numbers are usually "<year>-<region>-<province>-<category>...-<sequence>"
 * (optionally prefixed "Feedback - "). Pull the year, a short region-like code, and
 * the trailing sequence instead of blindly truncating, so the visible part stays
 * meaningful (e.g. "2027-CAR-00242" rather than "Feedba...-00242").
 */
export function shortenReferenceId(raw: string): string {
  const cleaned = raw.replace(/^feedback\s*-\s*/i, "").trim() || raw.trim();
  if (cleaned.length <= 20) return cleaned;

  const segments = cleaned.split(/[\s-]+/).filter(Boolean);
  const year = segments[0] && /^\d{4}$/.test(segments[0]) ? segments[0] : null;
  const code = segments.find((segment, index) => index > 0 && /^[A-Za-z]{1,5}\d{0,2}$/.test(segment)) ?? null;
  const sequence = segments.length > 1 ? segments[segments.length - 1] : null;

  const parts = [year, code, sequence].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  );

  return parts.length >= 2 ? parts.join("-") : `${cleaned.slice(0, 6)}…${cleaned.slice(-6)}`;
}

export function useClipboardCopy(value: string) {
  const [copied, setCopied] = useState(false);

  const copy = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return [copied, copy] as const;
}
