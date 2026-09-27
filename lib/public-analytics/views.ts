import {
  applyFilters,
  byArea,
  byCategory,
  byCommodity,
  byProgram,
  byRecipient,
  byStage,
  byYear,
  facilityTiles,
  filterOptions,
  finishedPerYear,
  mapPoints,
  summarize,
  type PublicFilters,
  type PublicProject,
} from "./aggregate";
import { PUBLIC_FIRST_YEAR } from "./service";

/** Every chart on the page, computed from the same filtered rows. */
export function buildDashboard(all: PublicProject[], filters: PublicFilters, dataAsOf: Date | null, now = new Date()) {
  const rows = applyFilters(all, filters);
  const summary = summarize(rows);
  const finished = finishedPerYear(rows, now, PUBLIC_FIRST_YEAR);
  return {
    dataAsOf: dataAsOf?.toISOString() ?? null,
    filters,
    options: filterOptions(all, filters),
    summary,
    area: byArea(rows, filters),
    years: byYear(rows, now, PUBLIC_FIRST_YEAR),
    categories: byCategory(rows),
    programs: byProgram(rows),
    stages: byStage(rows),
    recipients: byRecipient(rows),
    commodities: byCommodity(rows),
    tiles: facilityTiles(rows),
    finished,
    finishedWithoutDate: summary.finished - finished.reduce((total, year) => total + year.projects, 0),
    unmapped: rows.filter((row) => row.latitude === null).length,
  };
}

export type Dashboard = ReturnType<typeof buildDashboard>;

export const VIEW_BUILDERS = {
  summary: (rows: PublicProject[]) => summarize(rows),
  "by-year": (rows: PublicProject[]) => byYear(rows, new Date(), PUBLIC_FIRST_YEAR),
  "by-region": (rows: PublicProject[], filters: PublicFilters) => byArea(rows, filters),
  "by-category": (rows: PublicProject[]) => byCategory(rows),
  "by-program": (rows: PublicProject[]) => byProgram(rows),
  "by-stage": (rows: PublicProject[]) => byStage(rows),
  "by-recipient": (rows: PublicProject[]) => byRecipient(rows),
  "by-commodity": (rows: PublicProject[]) => byCommodity(rows),
  "finished-by-year": (rows: PublicProject[]) => finishedPerYear(rows, new Date(), PUBLIC_FIRST_YEAR),
  "map-points": (rows: PublicProject[]) => mapPoints(rows),
} as const;

export type ViewName = keyof typeof VIEW_BUILDERS;
