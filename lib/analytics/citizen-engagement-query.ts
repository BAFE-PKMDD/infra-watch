import { and, count, eq, gte, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";

import { user as authUser } from "@/auth-schema";
import { db } from "@/lib/db";
import { analyticsEvents, feedback, issues, projects } from "@/lib/db/schema";

export function buildManilaEventDayExpression() {
  return sql<string>`to_char(timezone('Asia/Manila', ${analyticsEvents.occurredAt}), 'YYYY-MM-DD')`;
}

export function buildManilaFeedbackDayExpression() {
  return sql<string>`to_char(timezone('Asia/Manila', ${feedback.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
}

const MANILA_TIME_ZONE = "Asia/Manila" as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CITIZEN_ANALYTICS_EVENT_NAMES = [
  "project_search_completed",
  "project_viewed",
  "project_opened_from_search",
  "map_viewed",
  "map_project_opened",
] as const;

type EventName = (typeof CITIZEN_ANALYTICS_EVENT_NAMES)[number];

type RangeInput = { from?: string | null; to?: string | null };
export type CitizenAnalyticsRange = {
  from: string;
  to: string;
  earliestAvailable: string;
  start: Date;
  endExclusive: Date;
  timeZone: typeof MANILA_TIME_ZONE;
};

export type CitizenEngagementAnalytics = {
  range: { from: string; to: string; earliestAvailable: string; timeZone: typeof MANILA_TIME_ZONE; maximumDays: 90 };
  freshness: { generatedAt: string; eventRetentionDays: 90 };
  overview: {
    searches: number;
    projectViews: number;
    mapViews: number;
    ratingsSubmitted: number;
    commentsSubmitted: number;
    averageRating: number | null;
  };
  trend: Array<{
    date: string;
    searches: number;
    projectViews: number;
    mapViews: number;
    ratingsSubmitted: number;
    commentsSubmitted: number;
  }>;
  projectDiscovery: {
    mostViewed: RankedProject[];
    mostOpenedFromSearch: RankedProject[];
    mostOpenedFromMap: RankedProject[];
    searchResultBands: Array<{ band: string; count: number }>;
  };
  commonIssues: {
    feedbackThemes: Array<{ key: string; label: string; count: number }>;
    eReportTypes: Array<{ key: string; label: string; count: number }>;
  };
  networkGeography: {
    minimumEventCount: 5;
    regions: Array<{ code: string; count: number }>;
  };
};

type RankedProject = { projectId: string; projectName: string; count: number };

function formatManilaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function parseCitizenAnalyticsRange(
  input: RangeInput,
  now = new Date(),
): CitizenAnalyticsRange {
  const defaultTo = formatManilaDate(now);
  const earliestAvailable = addCalendarDays(defaultTo, -89);
  const to = input.to?.trim() || defaultTo;
  const from = input.from?.trim() || addCalendarDays(to, -29);

  if (!isRealDate(from) || !isRealDate(to)) {
    throw new Error("Analytics dates must use a valid YYYY-MM-DD date.");
  }
  if (to > defaultTo) throw new Error("Analytics dates cannot be in the future.");
  const dayDifference = Math.round(
    (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) / 86_400_000,
  );
  if (dayDifference < 0) throw new Error("The from date must be on or before the to date.");
  if (dayDifference > 89) throw new Error("The analytics range cannot exceed 90 days.");
  if (from < earliestAvailable) throw new Error("Activity events are retained for the latest 90 days only.");

  return {
    from,
    to,
    earliestAvailable,
    start: new Date(`${from}T00:00:00+08:00`),
    endExclusive: new Date(`${addCalendarDays(to, 1)}T00:00:00+08:00`),
    timeZone: MANILA_TIME_ZONE,
  };
}

export function toIssueCategoryLabel(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) return "Not classified";
  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function asNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function summarizeEReportIssueTypes(rows: Array<{ issueType: string | null; count: number }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const labels = [...new Set(row.issueType?.split(" | ").map((label) => label.trim()).filter(Boolean) ?? [])];
    for (const key of labels.length ? labels : ["unclassified"]) {
      counts.set(key, (counts.get(key) ?? 0) + asNumber(row.count));
    }
  }
  return [...counts].map(([key, count]) => ({
    key,
    label: key === "unclassified" ? "Not classified" : toIssueCategoryLabel(key),
    count,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function summarizeApproximateNetworkRegions(
  rows: Array<{ code: string | null; count: number }>,
) {
  const minimumEventCount = 5 as const;
  const validRows = rows
    .filter((row): row is { code: string; count: number } => Boolean(row.code?.match(/^PH\d{9}$/)))
    .map((row) => ({ code: row.code, count: asNumber(row.count) }));
  return {
    minimumEventCount,
    regions: validRows
      .filter((row) => row.count >= minimumEventCount)
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
  };
}

export function buildVisibleNetworkRegionQuery(range: CitizenAnalyticsRange) {
  return db.select({ code: analyticsEvents.networkRegionCode, value: count() })
    .from(analyticsEvents)
    .where(and(
      gte(analyticsEvents.occurredAt, range.start),
      lt(analyticsEvents.occurredAt, range.endExclusive),
      isNotNull(analyticsEvents.networkRegionCode),
    ))
    .groupBy(analyticsEvents.networkRegionCode)
    .having(sql`count(*) >= 5`);
}

function dateSeries(from: string, to: string) {
  const values: string[] = [];
  for (let value = from; value <= to; value = addCalendarDays(value, 1)) values.push(value);
  return values;
}

export async function getCitizenEngagementAnalytics(
  input: RangeInput = {},
): Promise<CitizenEngagementAnalytics> {
  const range = parseCitizenAnalyticsRange(input);
  const eventWhere = and(
    gte(analyticsEvents.occurredAt, range.start),
    lt(analyticsEvents.occurredAt, range.endExclusive),
  );
  const feedbackWhere = and(
    gte(feedback.createdAt, range.start),
    lt(feedback.createdAt, range.endExclusive),
    ne(feedback.status, "rejected"),
    or(
      isNull(feedback.userId),
      isNull(authUser.role),
      sql`${authUser.role} not in ('admin', 'regional_admin', 'moderator')`,
    ),
  );
  const issueWhere = and(
    gte(issues.createdAt, range.start),
    lt(issues.createdAt, range.endExclusive),
    or(
      isNull(issues.reporterUserId),
      isNull(authUser.role),
      sql`${authUser.role} not in ('admin', 'regional_admin', 'moderator')`,
    ),
  );
  const manilaEventDay = buildManilaEventDayExpression();
  const manilaFeedbackDay = buildManilaFeedbackDayExpression();

  const [
    eventTotals,
    eventTrend,
    projectRankings,
    resultBands,
    feedbackSummaryRows,
    feedbackTrend,
    feedbackCategories,
    issueTypes,
    networkRegionRows,
  ] = await Promise.all([
    db.select({ eventName: analyticsEvents.eventName, value: count() })
      .from(analyticsEvents).where(eventWhere).groupBy(analyticsEvents.eventName),
    db.select({ day: manilaEventDay, eventName: analyticsEvents.eventName, value: count() })
      .from(analyticsEvents).where(eventWhere)
      .groupBy(manilaEventDay, analyticsEvents.eventName),
    db.select({
      eventName: analyticsEvents.eventName,
      projectId: analyticsEvents.resourceId,
      projectName: projects.name,
      value: count(),
    })
      .from(analyticsEvents)
      .innerJoin(projects, sql`coalesce(${projects.abemisId}, ${projects.projectCode}, ${projects.id}::text) = ${analyticsEvents.resourceId}`)
      .where(and(eventWhere, isNotNull(analyticsEvents.resourceId)))
      .groupBy(analyticsEvents.eventName, analyticsEvents.resourceId, projects.name),
    db.select({ band: analyticsEvents.resultCountBand, value: count() })
      .from(analyticsEvents)
      .where(and(eventWhere, eq(analyticsEvents.eventName, "project_search_completed"), isNotNull(analyticsEvents.resultCountBand)))
      .groupBy(analyticsEvents.resultCountBand),
    db.select({
      ratings: sql<number>`count(*) filter (where ${feedback.rating} is not null)`,
      comments: sql<number>`count(*) filter (where nullif(trim(${feedback.comment}), '') is not null)`,
      averageRating: sql<number | null>`avg(${feedback.rating})`,
    }).from(feedback).leftJoin(authUser, eq(authUser.id, feedback.userId)).where(feedbackWhere),
    db.select({
      day: manilaFeedbackDay,
      ratings: sql<number>`count(*) filter (where ${feedback.rating} is not null)`,
      comments: sql<number>`count(*) filter (where nullif(trim(${feedback.comment}), '') is not null)`,
    }).from(feedback).leftJoin(authUser, eq(authUser.id, feedback.userId)).where(feedbackWhere).groupBy(manilaFeedbackDay),
    db.select({ category: feedback.category, value: count() })
      .from(feedback).leftJoin(authUser, eq(authUser.id, feedback.userId)).where(feedbackWhere).groupBy(feedback.category),
    db.select({ issueType: issues.issueType, value: count() })
      .from(issues).leftJoin(authUser, eq(authUser.id, issues.reporterUserId)).where(issueWhere).groupBy(issues.issueType),
    buildVisibleNetworkRegionQuery(range),
  ]);

  const eventTotalMap = new Map(eventTotals.map((row) => [row.eventName as EventName, asNumber(row.value)]));
  const feedbackSummary = feedbackSummaryRows[0];
  const eventTrendMap = new Map<string, Map<string, number>>();
  for (const row of eventTrend) {
    const day = eventTrendMap.get(row.day) ?? new Map<string, number>();
    day.set(row.eventName, asNumber(row.value));
    eventTrendMap.set(row.day, day);
  }
  const feedbackTrendMap = new Map(feedbackTrend.map((row) => [row.day, row]));

  const ranked = (eventName: EventName): RankedProject[] => projectRankings
    .filter((row) => row.eventName === eventName && row.projectId)
    .map((row) => ({
      projectId: row.projectId!,
      projectName: row.projectName ?? row.projectId!,
      count: asNumber(row.value),
    }))
    .sort((a, b) => b.count - a.count || a.projectName.localeCompare(b.projectName))
    .slice(0, 10);

  return {
    range: {
      from: range.from,
      to: range.to,
      earliestAvailable: range.earliestAvailable,
      timeZone: range.timeZone,
      maximumDays: 90,
    },
    freshness: { generatedAt: new Date().toISOString(), eventRetentionDays: 90 },
    overview: {
      searches: eventTotalMap.get("project_search_completed") ?? 0,
      projectViews: eventTotalMap.get("project_viewed") ?? 0,
      mapViews: eventTotalMap.get("map_viewed") ?? 0,
      ratingsSubmitted: asNumber(feedbackSummary?.ratings),
      commentsSubmitted: asNumber(feedbackSummary?.comments),
      averageRating: feedbackSummary?.averageRating === null || feedbackSummary?.averageRating === undefined
        ? null
        : Number(Number(feedbackSummary.averageRating).toFixed(2)),
    },
    trend: dateSeries(range.from, range.to).map((date) => {
      const events = eventTrendMap.get(date);
      const feedbackDay = feedbackTrendMap.get(date);
      return {
        date,
        searches: events?.get("project_search_completed") ?? 0,
        projectViews: events?.get("project_viewed") ?? 0,
        mapViews: events?.get("map_viewed") ?? 0,
        ratingsSubmitted: asNumber(feedbackDay?.ratings),
        commentsSubmitted: asNumber(feedbackDay?.comments),
      };
    }),
    projectDiscovery: {
      mostViewed: ranked("project_viewed"),
      mostOpenedFromSearch: ranked("project_opened_from_search"),
      mostOpenedFromMap: ranked("map_project_opened"),
      searchResultBands: resultBands
        .filter((row): row is typeof row & { band: string } => Boolean(row.band))
        .map((row) => ({ band: row.band, count: asNumber(row.value) }))
        .sort((a, b) => ["0", "1_10", "11_50", "51_plus"].indexOf(a.band) - ["0", "1_10", "11_50", "51_plus"].indexOf(b.band)),
    },
    commonIssues: {
      feedbackThemes: feedbackCategories
        .map((row) => ({ key: row.category ?? "unclassified", label: toIssueCategoryLabel(row.category), count: asNumber(row.value) }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      eReportTypes: summarizeEReportIssueTypes(issueTypes.map((row) => ({ issueType: row.issueType, count: asNumber(row.value) }))),
    },
    networkGeography: summarizeApproximateNetworkRegions(
      networkRegionRows.map((row) => ({ code: row.code, count: asNumber(row.value) })),
    ),
  };
}
