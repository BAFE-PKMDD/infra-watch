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

export const EXECUTIVE_BRIEF_PROMPT = `Create a decision-focused analytical executive brief for the current authorized and filtered infrastructure portfolio.

Use exactly these six Markdown sections in this order:
## Executive Summary
## Descriptive Analytics
## Diagnostic Analytics
## Predictive Analytics
## Prescriptive Analytics
## Data Limitations

Analytical contract:
- Descriptive Analytics explains what is happening using official KPIs, coverage, schedule health, and bounded portfolio distributions.
- Diagnostic Analytics explains where material gaps are concentrated and which returned dimensions or project evidence contribute. Do not claim unobserved causation.
- Predictive Analytics uses only forecast evidence explicitly returned by tools. State "Insufficient history" when a projection is unavailable. Rules-based schedule health is an explainable outlook, not predictive modeling.
- Prescriptive Analytics gives concise advisory actions tied to returned deterministic insights and priority projects; identify the evidence supporting each action.

Grounding rules:
- Use only trusted dashboard tool results. Preserve official values and definitions exactly.
- State quantitative risk, rankings, counts, percentages, currency, dates, or forecasts only when a dashboard tool returns them as official data. Never invent, recalculate, extrapolate, or estimate a metric.
- If evidence is unavailable, say so explicitly; do not fill gaps with assumptions.
- Use only canonical project links returned by tools.
- Keep recommendations clearly advisory and tied to returned evidence.
- Do not emit chart blocks. The interface renders charts deterministically from the same captured authorized dashboard response.
- Do not include an AI disclaimer; the interface adds one exactly once.`;
