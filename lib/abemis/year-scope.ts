import { and, eq, ilike, inArray, not, notInArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { projects } from "@/lib/db/schema";

// INFRA Watch's ABEMIS feed is scoped to fiscal years 2021-2026 (docs/00-overview.md).
// This is the single source of truth for that boundary: sync ingestion filters
// out-of-range records here, and every project-listing/analytics query applies the same
// condition so legacy or future-year ABEMIS records already in the database never surface.
export const ABEMIS_SYNC_START_YEAR = 2021;
export const ABEMIS_SYNC_END_YEAR = 2026;

export const ABEMIS_SYNC_YEARS: string[] = Array.from(
  { length: ABEMIS_SYNC_END_YEAR - ABEMIS_SYNC_START_YEAR + 1 },
  (_, index) => String(ABEMIS_SYNC_START_YEAR + index),
);

export function isYearFundedInSyncScope(yearFunded: string | null | undefined): boolean {
  if (!yearFunded) return false;
  const year = Number.parseInt(yearFunded, 10);
  return Number.isInteger(year) && year >= ABEMIS_SYNC_START_YEAR && year <= ABEMIS_SYNC_END_YEAR;
}

export type AbemisSyncExclusionReason =
  | "outside-year-scope"
  | "proposal-through-2024"
  | "cancelled-or-archived"
  | "invalid-or-unclassified-stage";

type AbemisSyncScopeProject = {
  year_funded?: string | null;
  stage?: string | null;
  status?: string | null;
};

const CANCELLED_OR_ARCHIVED_PATTERN = /\b(?:cancel(?:led|ed|lation|ation)?|archiv(?:e|ed))\b/i;
const INVALID_STAGES = new Set(["0", "invalid", "unclassified"]);

export function getAbemisSyncExclusionReason(
  project: AbemisSyncScopeProject,
): AbemisSyncExclusionReason | null {
  if (!isYearFundedInSyncScope(project.year_funded)) {
    return "outside-year-scope";
  }

  const stage = project.stage?.trim().toLowerCase() ?? "";
  const status = project.status?.trim().toLowerCase() ?? "";

  if (CANCELLED_OR_ARCHIVED_PATTERN.test(`${stage} ${status}`)) {
    return "cancelled-or-archived";
  }

  if (!stage || INVALID_STAGES.has(stage)) {
    return "invalid-or-unclassified-stage";
  }

  if (stage === "proposal" && Number.parseInt(project.year_funded!, 10) <= 2024) {
    return "proposal-through-2024";
  }

  return null;
}

export function projectYearScopeCondition(column: AnyColumn = projects.yearFunded): SQL {
  const normalizedStage = sql<string>`lower(trim(coalesce(${projects.stage}, '')))`;
  const normalizedLifecycle = sql<string>`lower(concat_ws(' ', ${projects.stage}, ${projects.status}))`;

  return and(
    inArray(column, ABEMIS_SYNC_YEARS),
    notInArray(normalizedStage, ["", "0", "invalid", "unclassified"]),
    not(and(
      eq(normalizedStage, "proposal"),
      inArray(column, ["2021", "2022", "2023", "2024"]),
    )!),
    not(or(
      ilike(normalizedLifecycle, "%cancel%"),
      ilike(normalizedLifecycle, "%archiv%"),
    )!),
  )!;
}
