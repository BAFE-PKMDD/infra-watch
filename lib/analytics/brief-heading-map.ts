import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  DollarSign,
  MapPin,
  Target,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BriefSection {
  /** Original heading text from the LLM */
  rawHeading: string;
  /** Cleaned professional heading */
  heading: string;
  /** Tab key for grouping */
  tabKey: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Section body markdown (everything between this heading and the next) */
  body: string;
}

interface HeadingEntry {
  /** Keyword patterns to match (lowercase, at least one must match) */
  patterns: string[];
  /** Professional replacement heading */
  label: string;
  /** Tab key */
  tabKey: string;
  /** Icon component */
  icon: LucideIcon;
}

/* ------------------------------------------------------------------ */
/*  Heading map                                                        */
/* ------------------------------------------------------------------ */

const HEADING_ENTRIES: HeadingEntry[] = [
  {
    patterns: ["executive summary"],
    label: "Executive Summary",
    tabKey: "summary",
    icon: BarChart3,
  },
  {
    patterns: [
      "current status",
      "what is happening",
      "descriptive",
      "portfolio overview",
      "project overview",
    ],
    label: "Current Status",
    tabKey: "overview",
    icon: BarChart3,
  },
  {
    patterns: [
      "risk",
      "problem areas",
      "variance",
      "diagnostic",
      "gaps",
    ],
    label: "Risk & Problem Areas",
    tabKey: "risk",
    icon: AlertTriangle,
  },
  {
    patterns: [
      "forecast",
      "future outlook",
      "predictive",
      "outlook",
    ],
    label: "Forecast & Outlook",
    tabKey: "forecast",
    icon: Target,
  },
  {
    patterns: [
      "action item",
      "recommendation",
      "prescriptive",
      "next steps",
      "management examine",
    ],
    label: "Action Items",
    tabKey: "actions",
    icon: ClipboardCheck,
  },
  {
    patterns: ["regional", "by region", "region breakdown"],
    label: "Regional Breakdown",
    tabKey: "regional",
    icon: MapPin,
  },
  {
    patterns: ["budget", "financial", "fiscal", "funding"],
    label: "Budget & Financial",
    tabKey: "budget",
    icon: DollarSign,
  },
  {
    patterns: ["data limitation", "data coverage", "missing data", "incomplete"],
    label: "Data Limitations",
    tabKey: "limitations",
    icon: AlertTriangle,
  },
];

const DEFAULT_ENTRY: Omit<HeadingEntry, "patterns"> = {
  label: "",
  tabKey: "overview",
  icon: BarChart3,
};

/* ------------------------------------------------------------------ */
/*  Heading matcher                                                    */
/* ------------------------------------------------------------------ */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map a raw LLM heading to a professional heading.
 * Uses fuzzy substring matching against known patterns.
 */
export function mapBriefHeading(raw: string): {
  label: string;
  tabKey: string;
  icon: LucideIcon;
} {
  const normalized = normalize(raw);

  for (const entry of HEADING_ENTRIES) {
    const matched = entry.patterns.some((pattern) =>
      normalized.includes(pattern),
    );
    if (matched) {
      return { label: entry.label, tabKey: entry.tabKey, icon: entry.icon };
    }
  }

  // Fallback: clean up the raw heading, use its slug as tabKey
  const cleaned = raw
    .replace(/^#+\s*/, "")
    .replace(/[?!]+$/, "")
    .trim();
  const slug = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
  return {
    label: cleaned || raw,
    tabKey: slug,
    icon: DEFAULT_ENTRY.icon,
  };
}

/* ------------------------------------------------------------------ */
/*  Section parser                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse a markdown brief into structured sections.
 * Splits on level-2 headings (## ...).
 * Content before the first heading (if any) is assigned to "overview".
 */
export function parseBriefSections(markdown: string): BriefSection[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split("\n");
  const sections: BriefSection[] = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  function flush() {
    const body = currentBody.join("\n").trim();
    if (!body && !currentHeading) return;

    const mapped = currentHeading
      ? mapBriefHeading(currentHeading)
      : { label: "Executive Summary", tabKey: "overview", icon: BarChart3 };

    sections.push({
      rawHeading: currentHeading,
      heading: mapped.label,
      tabKey: mapped.tabKey,
      icon: mapped.icon,
      body,
    });
  }

  for (const line of lines) {
    // Match ## headings (level 2) but not ### or deeper
    const headingMatch = line.match(/^##\s+(?!#)(.+)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  // Flush the last section
  flush();

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Tab deduplication                                                   */
/* ------------------------------------------------------------------ */

/**
 * Deduplicate sections that map to the same tab key by merging their bodies.
 * Returns unique tabs with combined content.
 */
export function deduplicateSectionTabs(
  sections: BriefSection[],
): BriefSection[] {
  const map = new Map<string, BriefSection>();

  for (const section of sections) {
    const existing = map.get(section.tabKey);
    if (existing) {
      existing.body += `\n\n### ${section.heading}\n\n${section.body}`;
    } else {
      map.set(section.tabKey, { ...section });
    }
  }

  return Array.from(map.values());
}
