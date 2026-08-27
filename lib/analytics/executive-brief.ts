import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";

const FILTER_LABELS: Array<[keyof ManagerialDashboardFilters, string]> = [
  ["program", "Program"], ["year", "Year"], ["region", "Region"],
  ["province", "Province"], ["projectType", "Project type"],
  ["status", "Status"], ["health", "Schedule health"],
];

export const EXECUTIVE_BRIEF_DISCLAIMER =
  "AI-generated analysis—verify against the Infrastructure Analytics Dashboard before making official decisions.";
export const EXECUTIVE_BRIEF_HANDLING_LABEL =
  "Management working draft — authorized dashboard scope";

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

export function stripExecutiveBriefDisclaimer(content: string) {
  return content
    .replaceAll(EXECUTIVE_BRIEF_DISCLAIMER, "")
    .replace(/>\s*AI-generated analysis[^\n]*(?:\n|$)/gi, "")
    .trim();
}


export function executiveBriefPersistenceKey(
  userId: string,
  filters: ManagerialDashboardFilters,
  asOf: string,
  lastSuccessfulSyncAt: string | null = null,
) {
  const normalizedFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value != null && value !== "").sort(([a], [b]) => a.localeCompare(b)),
  );
  return `infra-watch:executive-brief:v2:${JSON.stringify({
    userId,
    asOf,
    lastSuccessfulSyncAt,
    filters: normalizedFilters,
  })}`;
}

export function executiveBriefStaleNudge(asOf: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return null;
  const supplied = Date.parse(`${asOf}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (!Number.isFinite(supplied) || today - supplied < 24 * 60 * 60 * 1_000) return null;
  return `Dashboard data is as of ${asOf}. Refresh the dashboard data before generating if a newer reporting date is expected.`;
}

export function shouldRetryExecutiveBrief(attempt: number, status: number, hasContent: boolean) {
  return attempt === 0 && !hasContent && (status === 429 || status >= 500);
}

export const EXECUTIVE_BRIEF_PROMPT = `Write a simple, easy-to-read summary report for the selected projects.
Write as if you are explaining this to a non-technical manager.

Use exactly these six Markdown sections in this order:
## Executive Summary
## Current Status & Overview
## Risk & Problem Areas
## Forecast & Future Outlook
## Action Items & Recommendations
## Data Limitations

Content Requirements:
- Current Status & Overview: Explain the current totals, budget, completion rates, and timeline status. Use charts to visualize breakdowns if helpful.
- Risk & Problem Areas: Explain where the main delays and issues are. Only state facts from the data without guessing why. Use charts to visualize risks if helpful.
- Forecast & Future Outlook: Use only projections explicitly provided by the tools. State "Insufficient history" when a projection is unavailable.
- Action Items & Recommendations: Give clear, simple next steps based on the factual data and priority projects; mention what data supports each action.
- Data Limitations: List any missing data like missing budgets, outdated records, or incomplete timelines.

Grounding rules:
- Use only trusted dashboard tool results.
- State totals, percentages, currency, and dates only when the tool provides them. Never invent or estimate numbers.
- Treat rules-based timeline labels as current assessments, not predictive forecasts.
- If data is missing, say so explicitly. Never use the word "null" in your output (use "Not specified" or "Unknown" instead).
- Use only the provided project links.
- Keep recommendations simple and tied to the data.
- You MAY emit chart blocks using \`\`\`chart markdown syntax to visualize distributions, risks, or financial breakdowns.
- Do not include an AI disclaimer.
- CRITICAL: Write in simple, humanized, everyday language.
- CRITICAL: NEVER use complex academic or technical words like "portfolio", "schedule-health", "deterministic", "aggregate", "comprises", or "assessments". Use simple terms instead (e.g., "all projects" instead of "portfolio", "timeline status" instead of "schedule health", "total" instead of "aggregate").
- Humanize category and dimension names (e.g., format "SwineProduction" as "Swine Production").`;
