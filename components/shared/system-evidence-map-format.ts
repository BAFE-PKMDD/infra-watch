"use client";

import { useState, type MouseEvent } from "react";

import {
  getSystemEvidenceLocationLabel,
  SYSTEM_EVIDENCE_NO_DESCRIPTION,
  SYSTEM_EVIDENCE_NO_LOCATION,
  type SystemEvidenceIssue,
} from "@/components/shared/system-evidence-map-types";

export function formatEvidenceLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type Translate = (path: string, variables?: Record<string, string | number>) => string;

// Known stored values mapped to their community.categories / community.statuses keys. The English
// entries read exactly as formatEvidenceLabel would, so unknown values can fall back to it.
const CATEGORY_KEYS: Record<string, string> = {
  general: "general",
  quality: "quality",
  progress: "progress",
  concerns: "concerns",
  damage: "damage",
  stopped: "stopped",
  safety: "safety",
  flooding: "flooding",
  blocked: "blocked",
  other: "other",
  Uncategorized: "uncategorized",
};

const STATUS_KEYS: Record<string, string> = {
  pending: "pending",
  submitted: "submitted",
  reviewing: "reviewing",
  "in-progress": "inProgress",
  approved: "approved",
  resolved: "resolved",
  closed: "closed",
  rejected: "rejected",
  suspended: "suspended",
};

/** Category label in the viewer's language; values without a translation keep formatEvidenceLabel's text. */
export function translateCategoryLabel(value: string, t: Translate) {
  const key = Object.hasOwn(CATEGORY_KEYS, value) ? CATEGORY_KEYS[value] : null;
  return key ? t(`community.categories.${key}`) : formatEvidenceLabel(value);
}

/** Status label in the viewer's language; values without a translation keep formatEvidenceLabel's text. */
export function translateStatusLabel(value: string, t: Translate) {
  const key = Object.hasOwn(STATUS_KEYS, value) ? STATUS_KEYS[value] : null;
  return key ? t(`community.statuses.${key}`) : formatEvidenceLabel(value);
}

/** Location line for a report, with the "not specified" fallback in the viewer's language. */
export function translateEvidenceLocation(issue: SystemEvidenceIssue, t: Translate) {
  const label = getSystemEvidenceLocationLabel(issue);
  return label === SYSTEM_EVIDENCE_NO_LOCATION ? t("community.evidenceMap.noLocation") : label;
}

/** Report text, with the parser's "no description" fallback in the viewer's language. */
export function translateEvidenceDescription(description: string, t: Translate) {
  return description === SYSTEM_EVIDENCE_NO_DESCRIPTION ? t("community.evidenceMap.noDescription") : description;
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
