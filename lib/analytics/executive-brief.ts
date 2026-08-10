import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";

const FILTER_LABELS: Array<[keyof ManagerialDashboardFilters, string]> = [
  ["program", "Program"],
  ["year", "Year"],
  ["region", "Region"],
  ["province", "Province"],
  ["projectType", "Project type"],
  ["status", "Status"],
  ["health", "Schedule health"],
];

const DISCLAIMER =
  "AI-generated analysis—verify against the Infrastructure Analytics Dashboard before making official decisions.";

function humanize(value: string) {
  if (value === "atRisk") return "At risk";
  if (value === "onTrack") return "On track";
  if (value === "notAssessed") return "Not assessed";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatExecutiveBriefScope(filters: ManagerialDashboardFilters) {
  const parts = FILTER_LABELS.flatMap(([key, label]) => {
    const value = filters[key];
    return value ? [`${label}: ${humanize(value)}`] : [];
  });
  return parts.length ? parts.join(" · ") : "All authorized dashboard data";
}

export function executiveBriefFilename(asOf: string) {
  const suffix = /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? `-${asOf}` : "";
  return `infrastructure-analytics-executive-brief${suffix}.md`;
}

export function buildExecutiveBriefMarkdown({
  content,
  filters,
  asOf,
  generatedAt,
}: {
  content: string;
  filters: ManagerialDashboardFilters;
  asOf: string;
  generatedAt: Date;
}) {
  return [
    "# Infrastructure Analytics Executive Brief",
    "",
    `**Data as of:** ${asOf}`,
    `**Authorized dashboard scope:** ${formatExecutiveBriefScope(filters)}`,
    `**Generated:** ${generatedAt.toISOString()}`,
    "",
    "---",
    "",
    content.trim(),
    "",
    "---",
    "",
    `> ${DISCLAIMER}`,
    "",
  ].join("\n");
}

export const EXECUTIVE_BRIEF_PROMPT = [
  "Create a concise executive brief for the current authorized and filtered infrastructure portfolio.",
  "Use only trusted dashboard tool results and do not recalculate official KPIs.",
  "Use Markdown with these sections: Executive Summary, KPI Snapshot, Material Risks, Regional or Program Findings, Priority Management Actions, and Data Limitations.",
  "Keep the brief decision-focused, identify unavailable evidence explicitly, and use canonical project links only when citing priority projects.",
].join(" ");
