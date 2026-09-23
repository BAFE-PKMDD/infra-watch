import { inArray, type AnyColumn, type SQL } from "drizzle-orm";
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

export function projectYearScopeCondition(column: AnyColumn = projects.yearFunded): SQL {
  return inArray(column, ABEMIS_SYNC_YEARS);
}
