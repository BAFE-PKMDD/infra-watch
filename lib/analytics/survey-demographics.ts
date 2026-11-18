import { and, count, eq, gte, isNull, lt, or, sql } from "drizzle-orm";

import { user as authUser } from "@/auth-schema";
import { db } from "@/lib/db";
import { submissionSurveys } from "@/lib/db/schema";

/** Groups smaller than this are never shown, so a small group cannot point to one person. */
export const MINIMUM_DEMOGRAPHIC_GROUP = 2 as const;

export type DemographicRow = { key: string; label: string; count: number };
export type DemographicDistribution = {
  rows: DemographicRow[];
  /** True when at least one group was left out for being under the minimum size. */
  hasHiddenGroups: boolean;
};

export type SurveyDemographics = {
  minimumGroupSize: typeof MINIMUM_DEMOGRAPHIC_GROUP;
  asked: number;
  answered: number;
  skipped: number;
  /** Share of people asked who answered, 0-100, or null when nobody was asked. */
  responseRate: number | null;
  respondentTypes: DemographicDistribution;
  ageBands: DemographicDistribution;
  genders: DemographicDistribution;
  referralSources: DemographicDistribution;
  surveySources: DemographicDistribution;
};

type CountRow = { key: string | null; count: number };

const NOT_PROVIDED = "not_provided";

const RESPONDENT_LABELS: Record<string, string> = {
  farmer: "Farmer",
  normal_citizen: "Normal citizen",
  student: "Student",
  bafe_employee: "BAFE employee",
  raed_staff: "RAED staff",
  other: "Other",
};

const REFERRAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  website: "Website",
  instagram: "Instagram",
  other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  feedback: "Feedback",
  e_report: "E-Report",
};

export const AGE_BANDS = [
  { key: "under_18", label: "Under 18" },
  { key: "18_24", label: "18–24" },
  { key: "25_34", label: "25–34" },
  { key: "35_44", label: "35–44" },
  { key: "45_54", label: "45–54" },
  { key: "55_64", label: "55–64" },
  { key: "65_plus", label: "65 and above" },
] as const;

export function ageToBandKey(age: number | null | undefined): string {
  if (age === null || age === undefined || !Number.isFinite(age) || age < 1) return NOT_PROVIDED;
  if (age < 18) return "under_18";
  if (age <= 24) return "18_24";
  if (age <= 34) return "25_34";
  if (age <= 44) return "35_44";
  if (age <= 54) return "45_54";
  if (age <= 64) return "55_64";
  return "65_plus";
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/^./, (character) => character.toUpperCase());
}

function asNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Merges rows that share a key, labels them, hides groups under the minimum size, and orders
 * the rest. `order` pins a fixed sequence (for example age bands); otherwise largest first.
 */
export function summarizeDistribution(
  rows: CountRow[],
  labelFor: (key: string) => string,
  order?: readonly string[],
): DemographicDistribution {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.key?.trim() ? row.key.trim() : NOT_PROVIDED;
    totals.set(key, (totals.get(key) ?? 0) + asNumber(row.count));
  }

  let hasHiddenGroups = false;
  const visible: DemographicRow[] = [];
  for (const [key, count] of totals) {
    if (count <= 0) continue;
    if (count < MINIMUM_DEMOGRAPHIC_GROUP) {
      hasHiddenGroups = true;
      continue;
    }
    visible.push({ key, label: key === NOT_PROVIDED ? "Not provided" : labelFor(key), count });
  }

  visible.sort((a, b) => {
    if (order) {
      const left = order.indexOf(a.key);
      const right = order.indexOf(b.key);
      return (left === -1 ? order.length : left) - (right === -1 ? order.length : right);
    }
    if (a.key === NOT_PROVIDED) return 1;
    if (b.key === NOT_PROVIDED) return -1;
    return b.count - a.count || a.label.localeCompare(b.label);
  });

  return { rows: visible, hasHiddenGroups };
}

export type SurveyDemographicsInput = {
  asked: number;
  answered: number;
  respondentTypes: CountRow[];
  ages: Array<{ age: number | null; count: number }>;
  genders: CountRow[];
  referralSources: CountRow[];
  surveySources: CountRow[];
};

export function buildSurveyDemographics(input: SurveyDemographicsInput): SurveyDemographics {
  const asked = asNumber(input.asked);
  const answered = asNumber(input.answered);
  const ageRows = input.ages.map((row) => ({ key: ageToBandKey(row.age), count: row.count }));
  return {
    minimumGroupSize: MINIMUM_DEMOGRAPHIC_GROUP,
    asked,
    answered,
    skipped: Math.max(asked - answered, 0),
    responseRate: asked > 0 ? Math.round((answered / asked) * 1000) / 10 : null,
    respondentTypes: summarizeDistribution(input.respondentTypes, (key) => RESPONDENT_LABELS[key] ?? titleCase(key)),
    ageBands: summarizeDistribution(ageRows, (key) => AGE_BANDS.find((band) => band.key === key)?.label ?? titleCase(key), [
      ...AGE_BANDS.map((band) => band.key),
      NOT_PROVIDED,
    ]),
    genders: summarizeDistribution(input.genders, (key) => key),
    referralSources: summarizeDistribution(input.referralSources, (key) => REFERRAL_LABELS[key] ?? titleCase(key)),
    surveySources: summarizeDistribution(input.surveySources, (key) => SOURCE_LABELS[key] ?? titleCase(key)),
  };
}

type DemographicsRange = { start: Date; endExclusive: Date };

/**
 * Aggregated answers to the optional "before you submit" survey. Staff accounts are left out,
 * names are never selected, and only counts leave this function.
 */
export async function getSurveyDemographics(range: DemographicsRange): Promise<SurveyDemographics> {
  const inRange = and(
    gte(submissionSurveys.createdAt, range.start),
    lt(submissionSurveys.createdAt, range.endExclusive),
    or(
      isNull(authUser.role),
      sql`${authUser.role} not in ('admin', 'regional_admin', 'moderator')`,
    ),
  );
  const answeredOnly = and(inRange, eq(submissionSurveys.skipped, false));
  const joinUser = eq(authUser.id, submissionSurveys.userId);

  const [totals, respondentTypes, ages, genders, referralSources, surveySources] = await Promise.all([
    db.select({
      asked: count(),
      answered: sql<number>`count(*) filter (where ${submissionSurveys.skipped} = false)`,
    }).from(submissionSurveys).leftJoin(authUser, joinUser).where(inRange),
    db.select({ key: submissionSurveys.respondentType, count: count() })
      .from(submissionSurveys).leftJoin(authUser, joinUser).where(answeredOnly)
      .groupBy(submissionSurveys.respondentType),
    db.select({ age: submissionSurveys.age, count: count() })
      .from(submissionSurveys).leftJoin(authUser, joinUser).where(answeredOnly)
      .groupBy(submissionSurveys.age),
    db.select({ key: submissionSurveys.gender, count: count() })
      .from(submissionSurveys).leftJoin(authUser, joinUser).where(answeredOnly)
      .groupBy(submissionSurveys.gender),
    db.select({ key: submissionSurveys.referralSource, count: count() })
      .from(submissionSurveys).leftJoin(authUser, joinUser).where(answeredOnly)
      .groupBy(submissionSurveys.referralSource),
    db.select({ key: submissionSurveys.sourceType, count: count() })
      .from(submissionSurveys).leftJoin(authUser, joinUser).where(answeredOnly)
      .groupBy(submissionSurveys.sourceType),
  ]);

  return buildSurveyDemographics({
    asked: asNumber(totals[0]?.asked),
    answered: asNumber(totals[0]?.answered),
    respondentTypes,
    ages,
    genders,
    referralSources,
    surveySources,
  });
}
