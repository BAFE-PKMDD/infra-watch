import { and, desc, eq, gte, ilike, inArray, isNull, notInArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";

import { mapInternalToPublicStage } from "@/constants/stage-mapping";
import { FARM_OPERATIONS, getProjectTypeMapping } from "@/lib/abemis/project-type-map";
import { db } from "@/lib/db";
import { projectMetricSnapshots, projects, syncLogs } from "@/lib/db/schema";
import { getProjectScopeConditions, type ScopedUser } from "@/lib/scope";
import { PROJECT_STATUS_FILTER_VALUES } from "@/types/managerial-dashboard.types";
import type {
  DashboardBreakdownDimension,
  ManagerialDashboardBreakdownData,
  ManagerialDashboardData,
  ManagerialDashboardDrillthroughData,
  ManagerialDashboardFilters,
  ProjectStatusFilter,
  ScheduleHealth,
} from "@/types/managerial-dashboard.types";
import { classifyScheduleHealth } from "./schedule-health";
import { calculateCompletionForecast } from "./completion-forecast";

const UNKNOWN = "Unknown";
const STALE_AFTER_HOURS = 26;
const PRIORITY_LIMIT = 10;
const VARIANCE_LIMIT = 50;
const COMMON_TYPES_LIMIT = 20;
const UNCLASSIFIED_CATEGORY = "Unclassified";
const LATE_DAYS_MIN_SAMPLE = 10;
const CONTRACTOR_MIN_PROJECTS = 8;

const DELAY_BUCKET_ORDER = ["onTimeOrEarly", "late1to30", "late31to90", "late91to180", "late181to365", "lateOver365"] as const;
const CONTRACT_LENGTH_BUCKET_ORDER = ["30orLess", "31to60", "61to90", "91to180", "over180"] as const;
const OVERDUE_BUCKET_ORDER = ["notYetDue", "under6mo", "6to12mo", "1to2yr", "over2yr", "noDates"] as const;
const TURNOVER_BUCKET_ORDER = ["under6mo", "6to12mo", "1to2yr", "2to4yr", "over4yr"] as const;
const REGIONAL_INSIGHT_MINIMUM = 5;
export const MAX_DASHBOARD_ROWS = 30_000;

export class DashboardScopeTooLargeError extends Error {
  constructor() {
    super(`Dashboard scope exceeds ${MAX_DASHBOARD_ROWS.toLocaleString()} projects; narrow the filters and try again.`);
    this.name = "DashboardScopeTooLargeError";
  }
}

export function enforceDashboardRowLimit(rowCount: number) {
  if (rowCount > MAX_DASHBOARD_ROWS) throw new DashboardScopeTooLargeError();
}

export type DashboardProjectRow = {
  projectId: string;
  projectName: string;
  program: string | null;
  region: string | null;
  province: string | null;
  projectType: string | null;
  yearFunded: string | null;
  status: string | null;
  allocatedBudget: string | number | null;
  actualBidAmount: string | number | null;
  physicalProgress: number | null;
  hasPhysicalProgressEvidence: boolean;
  startDate: Date | string | null;
  targetCompletionDate: Date | string | null;
  actualCompletionDate: Date | string | null;
  lastSyncedAt: Date | string;
};

export type DashboardConditionDescriptor = {
  source: "scope" | "filter";
  field:
    | "program"
    | "year"
    | "region"
    | "province"
    | "projectType"
    | "status"
    | "health";
  value: string;
};

type SyncFreshnessInput = {
  lastSuccessfulSyncAt?: Date | string | null;
  latestSyncStatus?: string | null;
  now?: Date;
};

type EnrichedRow = DashboardProjectRow & {
  canonicalStatus: ProjectStatusFilter;
  health: ScheduleHealth;
  expectedProgress: number | null;
  variance: number | null;
  daysToTarget: number | null;
  reasonCode: string;
};

export function buildDashboardConditionDescriptors(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
): DashboardConditionDescriptor[] {
  const descriptors: DashboardConditionDescriptor[] = [];
  if (user.role === "moderator" && user.region) {
    descriptors.push({ source: "scope", field: "region", value: user.region });
  }
  if (user.role === "moderator" && user.assignedAgency) {
    descriptors.push({ source: "scope", field: "program", value: user.assignedAgency });
  }

  const filterEntries: Array<[DashboardConditionDescriptor["field"], string | undefined]> = [
    ["program", filters.program],
    ["year", filters.year],
    ["region", filters.region],
    ["province", filters.province],
    ["projectType", filters.projectType],
    ["status", filters.status],
    ["health", filters.health],
  ];
  for (const [field, value] of filterEntries) {
    if (value) descriptors.push({ source: "filter", field, value });
  }
  return descriptors;
}

export function buildDashboardConditions(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
): SQL[] {
  const conditions = [...getProjectScopeConditions(user)];
  if (filters.program) conditions.push(dimensionCondition(projects.program, filters.program, false));
  if (filters.year) conditions.push(dimensionCondition(projects.yearFunded, filters.year, false));
  if (filters.region) conditions.push(dimensionCondition(projects.region, filters.region, true));
  if (filters.province) conditions.push(dimensionCondition(projects.province, filters.province, true));
  if (filters.projectType) conditions.push(dimensionCondition(projects.projectType, filters.projectType, true));
  // Canonical status and schedule health use shared domain classifiers after retrieval.
  return conditions;
}

function dimensionCondition(column: AnyColumn, value: string, caseInsensitive: boolean): SQL {
  if (value === UNKNOWN) {
    return or(isNull(column), sql`btrim(${column}) = ''`)!;
  }
  return caseInsensitive ? ilike(column, value) : eq(column, value);
}

type DashboardQueryName =
  | "summary"
  | "scheduleHealth"
  | "statuses"
  | "regions"
  | "projectTypes"
  | "fundingYears"
  | "statusByYear"
  | "regionProjectTypes"
  | "projectTypeStats"
  | "procurementModes"
  | "completionDelayBuckets"
  | "lateDaysByRegion"
  | "lateDaysByProjectType"
  | "lateRateByContractLength"
  | "lateRateByYear"
  | "ntpLagByProcurementMode"
  | "ongoingOverdueBuckets"
  | "ongoingByYear"
  | "turnoverBuckets"
  | "turnoverByRegion"
  | "contractors"
  | "progressVariance"
  | "priorityProjects"
  | "filterOptions";

function numberSql(expression: SQL) {
  return sql<number>`${expression}`.mapWith(Number);
}

export function currencyFromCents(value: unknown) {
  const cents = BigInt(String(value));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("Dashboard currency total exceeds safe cent precision");
  }
  return Number(cents) / 100;
}

function currencySumOfExpression(expression: SQL) {
  return sql<number>`round(coalesce(sum(${expression}), 0) * 100)::bigint`
    .mapWith(currencyFromCents);
}

function currencySumSql(column: AnyColumn) {
  return currencySumOfExpression(sql`${column}`);
}

// Zero and blank budgets are a known data-quality placeholder (see
// lib/data-quality/project-quality.ts "missing_approved_budget"), so a
// "typical cost" excludes them the same way totals already do; null means
// no project of this type has a usable budget to compute a typical cost from.
function percentileOfExpression(expression: SQL, fraction: number, filterCondition: SQL) {
  return sql<number | null>`percentile_cont(${fraction}) within group (order by ${expression}) filter (where ${filterCondition})`
    .mapWith((value) => (value === null ? null : Number(value)));
}

function percentileSql(column: AnyColumn, fraction: number) {
  return percentileOfExpression(sql`${column}`, fraction, sql`${column} > 0`);
}

function percentSql(numerator: SQL, denominator: SQL) {
  return sql<number | null>`round(100.0 * (${numerator}) / nullif((${denominator}), 0), 1)`
    .mapWith((value) => (value === null ? null : Number(value)));
}

function canonicalStatusExpression() {
  return sql<ProjectStatusFilter>`case
    when lower(btrim(${projects.status})) = 'suspended' then 'suspended'
    when lower(btrim(${projects.status})) in ('completed', 'inventory') then 'completed'
    when lower(btrim(${projects.status})) in ('ongoing', 'implementation', 'under-construction', 'for turn-over') then 'ongoing'
    when lower(btrim(${projects.status})) in (
      'proposal', 'pre-implementation', 'procurement', 'not yet started',
      'incomplete documents', 'planned', 'under-procurement', 'proposal validated',
      'implementation-ready with recommendations', 'implementation-ready', 'for review'
    ) then 'planned'
    when lower(${projects.status}) like '%complete%' or lower(${projects.status}) like '%done%' then 'completed'
    when lower(${projects.status}) like '%ongoing%'
      or lower(${projects.status}) like '%progress%'
      or (
        lower(${projects.status}) like '%implementation%'
        and lower(${projects.status}) not like '%ready%'
        and lower(${projects.status}) not like '%pre%'
      ) then 'ongoing'
    else 'planned'
  end`;
}

function physicalProgressEvidenceExpression() {
  return sql<boolean>`exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(${projects.metadata}->'powRelation') = 'array'
        then ${projects.metadata}->'powRelation'
        else '[]'::jsonb
      end
    ) as pow(item)
    where nullif(btrim(pow.item->>'actual'), '') is not null
      and replace(btrim(pow.item->>'actual'), ',', '') ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$'
  )`;
}

function manilaDateExpression(column: AnyColumn) {
  return sql`(${column} at time zone 'UTC' at time zone 'Asia/Manila')::date`;
}

function dashboardSqlExpressions(asOf: string) {
  const canonicalStatus = canonicalStatusExpression();
  const hasProgressEvidence = physicalProgressEvidenceExpression();
  const startDate = manilaDateExpression(projects.startDate);
  const targetDate = manilaDateExpression(projects.targetCompletionDate);
  const asOfDate = sql`${asOf}::date`;
  const durationDays = sql`(${targetDate} - ${startDate})`;
  const daysToTarget = sql`(${targetDate} - ${asOfDate})`;
  const expectedProgress = sql<number>`least(100.0, greatest(0.0,
    100.0 * (${asOfDate} - ${startDate}) / nullif(${durationDays}, 0)
  ))`;
  const variance = sql<number>`(${projects.physicalProgress} - ${expectedProgress})`;
  const health = sql<ScheduleHealth>`case
    when ${canonicalStatus} = 'completed' then 'notAssessed'
    when ${projects.startDate} is null or ${projects.targetCompletionDate} is null then 'notAssessed'
    when ${durationDays} <= 0 or ${asOfDate} < ${startDate} then 'notAssessed'
    when ${canonicalStatus} <> 'ongoing' then 'notAssessed'
    when ${targetDate} < ${asOfDate} then 'delayed'
    when not ${hasProgressEvidence}
      or ${projects.physicalProgress} < 0 or ${projects.physicalProgress} > 100 then 'notAssessed'
    when -(${variance}) >= 15 then 'atRisk'
    when ${daysToTarget} between 0 and 30 and ${projects.physicalProgress} < 80 then 'atRisk'
    else 'onTrack'
  end`;
  return { canonicalStatus, hasProgressEvidence, startDate, targetDate, durationDays, daysToTarget, expectedProgress, variance, health };
}

function dashboardBaseQuery(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  asOf: string,
) {
  const expressions = dashboardSqlExpressions(asOf);
  const conditions = buildDashboardConditions(filters, user);
  return db
    .select({
      projectId: projects.abemisId,
      projectName: projects.name,
      program: projects.program,
      region: projects.region,
      province: projects.province,
      projectType: projects.projectType,
      yearFunded: projects.yearFunded,
      allocatedBudget: projects.budget,
      actualBidAmount: projects.abc,
      physicalProgress: sql<number | null>`case when ${expressions.hasProgressEvidence} then ${projects.physicalProgress} else null end`.as("physical_progress"),
      startDate: projects.startDate,
      targetCompletionDate: projects.targetCompletionDate,
      actualCompletionDate: projects.actualCompletionDate,
      calendarDays: projects.calendarDays,
      procurementMode: projects.procurementMode,
      contractorName: projects.contractorName,
      contractAmount: projects.contractAmount,
      dateTurnOver: projects.dateTurnOver,
      canonicalStatus: expressions.canonicalStatus.as("canonical_status"),
      health: expressions.health.as("health"),
      expectedProgress: sql<number | null>`case when ${expressions.health} in ('onTrack', 'atRisk') then ${expressions.expectedProgress} else null end`.as("expected_progress"),
      variance: sql<number | null>`case when ${expressions.health} in ('onTrack', 'atRisk') then ${expressions.variance} else null end`.as("variance"),
      daysToTarget: sql<number | null>`case when ${expressions.health} in ('onTrack', 'atRisk', 'delayed') then ${expressions.daysToTarget} else null end`.as("days_to_target"),
      hasSchedule: sql<boolean>`(${projects.startDate} is not null and ${projects.targetCompletionDate} is not null and ${expressions.durationDays} > 0)`.as("has_schedule"),
      hasProgressEvidence: expressions.hasProgressEvidence.as("has_progress_evidence"),
    })
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .as("dashboard_base");
}

function filteredBaseCondition(
  base: ReturnType<typeof dashboardBaseQuery>,
  filters: ManagerialDashboardFilters,
) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(base.canonicalStatus, filters.status));
  if (filters.health) conditions.push(eq(base.health, filters.health));
  return conditions.length ? and(...conditions) : undefined;
}

export function buildDashboardScopeCountQuery(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  asOf: string,
) {
  const base = dashboardBaseQuery(filters, user, asOf);
  return db
    .select({ total: numberSql(sql`count(*)::int`) })
    .from(base)
    .where(filteredBaseCondition(base, filters));
}

export function buildDashboardDrillthroughQueryPlan(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  asOf: string,
  pagination: { page: number; pageSize: number },
  options?: { otherProjectTypes?: { excluded: string[] } },
) {
  const base = dashboardBaseQuery(filters, user, asOf);
  const filtered = filteredBaseCondition(base, filters);
  const normalizedProjectType = sql<string>`coalesce(nullif(btrim(${base.projectType}), ''), ${UNKNOWN})`;
  const otherProjectTypes = options?.otherProjectTypes;
  const drillthroughCondition = otherProjectTypes && otherProjectTypes.excluded.length > 0
    ? and(
        sql`${normalizedProjectType} <> ${UNKNOWN}`,
        notInArray(normalizedProjectType, otherProjectTypes.excluded),
      )
    : undefined;
  const where = and(filtered, drillthroughCondition);
  const total = db
    .select({ total: numberSql(sql`count(*)::int`) })
    .from(base)
    .where(where);
  const rows = db
    .select({
      projectId: base.projectId,
      projectName: base.projectName,
      program: base.program,
      region: base.region,
      province: base.province,
      projectType: base.projectType,
      status: base.canonicalStatus,
      health: base.health,
      allocatedBudget: base.allocatedBudget,
      physicalProgress: base.physicalProgress,
      expectedProgress: base.expectedProgress,
      variance: base.variance,
      targetCompletionDate: base.targetCompletionDate,
      startDate: base.startDate,
      calendarDays: base.calendarDays,
    })
    .from(base)
    .where(where)
    .orderBy(
      sql`case when ${base.health} = 'delayed' then 0 when ${base.health} = 'atRisk' then 1 else 2 end`,
      sql`${base.variance} asc nulls last`,
      base.projectName,
      base.projectId,
    )
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize);
  return { total, rows };
}

export async function getManagerialDashboardDrillthrough(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  pagination: { page: number; pageSize: number },
  options?: { otherProjectTypes?: { excluded: string[] } },
): Promise<ManagerialDashboardDrillthroughData> {
  const asOf = manilaDateKey(new Date());
  const plan = buildDashboardDrillthroughQueryPlan(filters, user, asOf, pagination, options);
  const [totalRows, projectRows] = await Promise.all([plan.total, plan.rows]);
  return {
    asOf,
    total: totalRows[0]?.total ?? 0,
    page: pagination.page,
    pageSize: pagination.pageSize,
    projects: projectRows.map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      program: normalizedLabel(row.program),
      region: row.region,
      province: row.province,
      projectType: normalizedLabel(row.projectType),
      status: row.status,
      health: row.health,
      allocatedBudget: toNumber(row.allocatedBudget),
      physicalProgress: row.physicalProgress === null ? null : Number(row.physicalProgress),
      expectedProgress: row.expectedProgress === null ? null : round(Number(row.expectedProgress)),
      variance: row.variance === null ? null : round(Number(row.variance)),
      targetCompletionDate: row.targetCompletionDate?.toISOString() ?? null,
      ntpDate: row.startDate?.toISOString() ?? null,
      calendarDays: row.calendarDays === null ? null : Number(row.calendarDays),
    })),
  };
}

/** Query plan kept public so tests can prove every portfolio read is aggregate or bounded. */
export function buildDashboardAggregateQueryPlan(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  asOf: string,
) {
  const base = dashboardBaseQuery(filters, user, asOf);
  const filtered = filteredBaseCondition(base, filters);
  const label = (column: AnyColumn) => sql<string>`coalesce(nullif(btrim(${column}), ''), ${UNKNOWN})`;
  const count = numberSql(sql`count(*)::int`);
  const budget = currencySumSql(base.allocatedBudget);
  const isCompleted = sql`${base.canonicalStatus} = 'completed'`;
  const isDelayed = sql`${base.health} = 'delayed'`;
  const isAtRisk = sql`${base.health} = 'atRisk'`;
  const isAssessed = sql`${base.health} <> 'notAssessed'`;
  // "abc" is the supplier's actual bid amount, not a cost estimate; a bid above the
  // approved budget is a data-quality/oversight signal, not spending or utilization.
  const isBidOverBudget = sql`${base.allocatedBudget} is not null and ${base.actualBidAmount} is not null and ${base.actualBidAmount} > ${base.allocatedBudget}`;

  const summary = db.select({
    total: count,
    withBudget: numberSql(sql`count(${base.allocatedBudget})::int`),
    withActualBidAmount: numberSql(sql`count(${base.actualBidAmount})::int`),
    withSchedule: numberSql(sql`count(*) filter (where ${base.hasSchedule})::int`),
    withPhysicalProgress: numberSql(sql`count(*) filter (where ${base.hasProgressEvidence})::int`),
    allocatedBudget: budget,
    actualBidAmount: currencySumSql(base.actualBidAmount),
    completed: numberSql(sql`coalesce(sum(case when ${isCompleted} then 1 else 0 end), 0)::int`),
    delayed: numberSql(sql`coalesce(sum(case when ${isDelayed} then 1 else 0 end), 0)::int`),
    atRisk: numberSql(sql`coalesce(sum(case when ${isAtRisk} then 1 else 0 end), 0)::int`),
    dueSoon: numberSql(sql`coalesce(sum(case when ${isAtRisk} and ${base.daysToTarget} between 0 and 30 then 1 else 0 end), 0)::int`),
    bidExceedsBudgetCount: numberSql(sql`coalesce(sum(case when ${isBidOverBudget} then 1 else 0 end), 0)::int`),
    bidOverrunTotal: sql<number>`round(coalesce(sum(case when ${isBidOverBudget} then ${base.actualBidAmount} - ${base.allocatedBudget} else 0 end), 0) * 100)::bigint`
      .mapWith(currencyFromCents),
  }).from(base).where(filtered);

  const scheduleHealth = db.select({
    key: base.health,
    count,
    budget,
  }).from(base).where(filtered).groupBy(base.health).orderBy(base.health);

  const statuses = db.select({
    key: base.canonicalStatus,
    count,
    budget,
  }).from(base).where(filtered).groupBy(base.canonicalStatus).orderBy(base.canonicalStatus);

  const regionLabel = label(base.region).as("region_label");
  const regions = db.select({
    region: regionLabel,
    total: count,
    assessed: numberSql(sql`sum(case when ${isAssessed} then 1 else 0 end)::int`),
    completed: numberSql(sql`sum(case when ${isCompleted} then 1 else 0 end)::int`),
    delayed: numberSql(sql`sum(case when ${isDelayed} then 1 else 0 end)::int`),
    atRisk: numberSql(sql`sum(case when ${isAtRisk} then 1 else 0 end)::int`),
    allocatedBudget: budget,
  }).from(base).where(filtered).groupBy(regionLabel);

  const projectTypeLabel = label(base.projectType).as("project_type_label");
  const projectTypes = db.select({
    projectType: projectTypeLabel,
    total: count,
    allocatedBudget: budget,
    delayed: numberSql(sql`sum(case when ${isDelayed} then 1 else 0 end)::int`),
  }).from(base).where(filtered).groupBy(projectTypeLabel);

  const yearFundedLabel = label(base.yearFunded).as("year_funded_label");
  const fundingYears = db.select({
    yearFunded: yearFundedLabel,
    total: count,
    assessed: numberSql(sql`sum(case when ${isAssessed} then 1 else 0 end)::int`),
    completed: numberSql(sql`sum(case when ${isCompleted} then 1 else 0 end)::int`),
    delayed: numberSql(sql`sum(case when ${isDelayed} then 1 else 0 end)::int`),
    allocatedBudget: budget,
  }).from(base).where(filtered).groupBy(yearFundedLabel);

  const statusByYear = db.select({
    yearFunded: yearFundedLabel,
    status: base.canonicalStatus,
    count,
    budget,
  }).from(base).where(filtered).groupBy(yearFundedLabel, base.canonicalStatus);

  const regionProjectTypes = db.select({
    region: regionLabel,
    projectType: projectTypeLabel,
    count,
    budget,
  }).from(base).where(filtered).groupBy(regionLabel, projectTypeLabel);

  const projectTypeStats = db.select({
    projectType: projectTypeLabel,
    total: count,
    allocatedBudget: budget,
    medianBudget: percentileSql(base.allocatedBudget, 0.5),
    p25Budget: percentileSql(base.allocatedBudget, 0.25),
    p75Budget: percentileSql(base.allocatedBudget, 0.75),
  }).from(base).where(filtered).groupBy(projectTypeLabel);

  const procurementModeLabel = label(base.procurementMode).as("procurement_mode_label");
  const procurementModes = db.select({
    mode: procurementModeLabel,
    total: count,
    allocatedBudget: budget,
  }).from(base).where(filtered).groupBy(procurementModeLabel);

  // "Late" reuses the same targetCompletionDate the rest of this dashboard already
  // treats as the authoritative deadline (see dashboardSqlExpressions' `health`
  // logic) rather than recomputing a second deadline from calendarDays, so the
  // two don't disagree about whether the same project is late.
  const hasCompletionDates = sql`${base.actualCompletionDate} is not null and ${base.targetCompletionDate} is not null`;
  const lateDays = sql<number>`(${base.actualCompletionDate}::date - ${base.targetCompletionDate}::date)`;
  const isLateCompleted = sql`${hasCompletionDates} and ${lateDays} > 0`;
  const completedWithDatesCount = sql`sum(case when ${hasCompletionDates} then 1 else 0 end)`;
  const lateCompletedCount = sql`sum(case when ${isLateCompleted} then 1 else 0 end)`;

  const delayBucketExpr = sql<string>`case
    when ${lateDays} <= 0 then 'onTimeOrEarly'
    when ${lateDays} <= 30 then 'late1to30'
    when ${lateDays} <= 90 then 'late31to90'
    when ${lateDays} <= 180 then 'late91to180'
    when ${lateDays} <= 365 then 'late181to365'
    else 'lateOver365'
  end`.as("delay_bucket");
  const completionDelayBuckets = db.select({
    bucket: delayBucketExpr,
    count,
  }).from(base).where(and(filtered, hasCompletionDates)).groupBy(delayBucketExpr);

  const lateDaysByRegion = db.select({
    key: regionLabel,
    medianLateDays: percentileOfExpression(lateDays, 0.5, isLateCompleted),
    lateCount: numberSql(lateCompletedCount),
    totalWithDates: numberSql(completedWithDatesCount),
  }).from(base).where(filtered).groupBy(regionLabel);

  const lateDaysByProjectType = db.select({
    key: projectTypeLabel,
    medianLateDays: percentileOfExpression(lateDays, 0.5, isLateCompleted),
    lateCount: numberSql(lateCompletedCount),
    totalWithDates: numberSql(completedWithDatesCount),
  }).from(base).where(filtered).groupBy(projectTypeLabel);

  const contractLengthBucketExpr = sql<string>`case
    when ${base.calendarDays} <= 30 then '30orLess'
    when ${base.calendarDays} <= 60 then '31to60'
    when ${base.calendarDays} <= 90 then '61to90'
    when ${base.calendarDays} <= 180 then '91to180'
    else 'over180'
  end`.as("contract_length_bucket");
  const lateRateByContractLength = db.select({
    bucket: contractLengthBucketExpr,
    lateCount: numberSql(lateCompletedCount),
    total: numberSql(completedWithDatesCount),
  }).from(base).where(and(filtered, sql`${base.calendarDays} is not null`)).groupBy(contractLengthBucketExpr);

  const lateRateByYear = db.select({
    yearFunded: yearFundedLabel,
    lateCount: numberSql(lateCompletedCount),
    total: numberSql(completedWithDatesCount),
  }).from(base).where(filtered).groupBy(yearFundedLabel);

  // "Budget takes effect" isn't a stored field; this assumes January 1 of the
  // funding year, the standard PH government budget-cycle reference point.
  // Disclosed in the chart's own description, not asserted as fact elsewhere.
  const isValidFundingYear = sql`${base.yearFunded} ~ '^[0-9]{4}$'`;
  const ntpLagDays = sql<number>`(${base.startDate}::date - make_date(${base.yearFunded}::int, 1, 1))`;
  const hasNtpLag = sql`${base.startDate} is not null`;
  const ntpLagByProcurementMode = db.select({
    mode: procurementModeLabel,
    medianDays: percentileOfExpression(ntpLagDays, 0.5, hasNtpLag),
    p25Days: percentileOfExpression(ntpLagDays, 0.25, hasNtpLag),
    p75Days: percentileOfExpression(ntpLagDays, 0.75, hasNtpLag),
  }).from(base).where(and(filtered, isValidFundingYear, hasNtpLag)).groupBy(procurementModeLabel);

  const asOfDateSql = sql`${asOf}::date`;
  const daysPastTarget = sql<number>`(${asOfDateSql} - ${base.targetCompletionDate}::date)`;
  const isOngoing = sql`${base.canonicalStatus} = 'ongoing'`;
  const isZeroProgress = sql`coalesce(${base.physicalProgress}, 0) = 0`;
  const overdueBucketExpr = sql<string>`case
    when ${base.targetCompletionDate} is null then 'noDates'
    when ${daysPastTarget} < 0 then 'notYetDue'
    when ${daysPastTarget} <= 182 then 'under6mo'
    when ${daysPastTarget} <= 365 then '6to12mo'
    when ${daysPastTarget} <= 730 then '1to2yr'
    else 'over2yr'
  end`.as("overdue_bucket");
  const ongoingOverdueBuckets = db.select({
    bucket: overdueBucketExpr,
    zeroProgress: numberSql(sql`sum(case when ${isZeroProgress} then 1 else 0 end)::int`),
    someProgress: numberSql(sql`sum(case when not (${isZeroProgress}) then 1 else 0 end)::int`),
  }).from(base).where(and(filtered, isOngoing)).groupBy(overdueBucketExpr);

  const ongoingByYear = db.select({
    yearFunded: yearFundedLabel,
    zeroProgress: numberSql(sql`sum(case when ${isZeroProgress} then 1 else 0 end)::int`),
    someProgress: numberSql(sql`sum(case when not (${isZeroProgress}) then 1 else 0 end)::int`),
  }).from(base).where(and(filtered, isOngoing)).groupBy(yearFundedLabel);

  // dateTurnOver is a raw, previously-unused text field, read here as "the date
  // turnover happened"; a completed project with it still blank is read as
  // still waiting. See the plan's disclosed assumption for this interpretation.
  const hasTurnedOver = sql`${base.dateTurnOver} is not null and btrim(${base.dateTurnOver}) <> ''`;
  const isWaitingTurnover = sql`${base.canonicalStatus} = 'completed' and ${base.actualCompletionDate} is not null and not (${hasTurnedOver})`;
  const waitingDays = sql<number>`(${asOfDateSql} - ${base.actualCompletionDate}::date)`;
  const turnoverBucketExpr = sql<string>`case
    when ${waitingDays} < 183 then 'under6mo'
    when ${waitingDays} < 365 then '6to12mo'
    when ${waitingDays} < 730 then '1to2yr'
    when ${waitingDays} < 1461 then '2to4yr'
    else 'over4yr'
  end`.as("turnover_bucket");
  const turnoverBuckets = db.select({
    bucket: turnoverBucketExpr,
    count,
  }).from(base).where(and(filtered, isWaitingTurnover)).groupBy(turnoverBucketExpr);

  const turnoverByRegion = db.select({
    region: regionLabel,
    waiting: count,
    waitingOver1Year: numberSql(sql`sum(case when ${waitingDays} >= 365 then 1 else 0 end)::int`),
    allocatedBudget: budget,
  }).from(base).where(and(filtered, isWaitingTurnover)).groupBy(regionLabel);

  const contractorLabel = sql<string>`nullif(btrim(${base.contractorName}), '')`.as("contractor_label");
  // A WHERE clause can't reference a SELECT-list alias in Postgres (WHERE
  // evaluates before SELECT), unlike GROUP BY which can — so this re-derives
  // the condition from the base column instead of reusing contractorLabel.
  const hasContractor = sql`nullif(btrim(${base.contractorName}), '') is not null`;
  const contractValueExpr = sql`coalesce(${base.contractAmount}, ${base.actualBidAmount})`;
  const contractors = db.select({
    name: contractorLabel,
    projectsChecked: numberSql(completedWithDatesCount),
    medianLateDays: percentileOfExpression(lateDays, 0.5, isLateCompleted),
    latePct: percentSql(lateCompletedCount, completedWithDatesCount),
    overThreeMonthsLatePct: percentSql(sql`sum(case when ${hasCompletionDates} and ${lateDays} > 90 then 1 else 0 end)`, completedWithDatesCount),
    contractValue: currencySumOfExpression(contractValueExpr),
    regionCount: numberSql(sql`count(distinct ${label(base.region)})::int`),
    mostlyBuilds: sql<string | null>`mode() within group (order by ${label(base.projectType)})`,
  }).from(base).where(and(filtered, hasContractor)).groupBy(contractorLabel);

  const progressVariance = db.select({
    projectId: base.projectId,
    projectName: base.projectName,
    expectedProgress: base.expectedProgress,
    physicalProgress: base.physicalProgress,
    variance: base.variance,
    health: base.health,
  }).from(base).where(and(filtered, sql`${base.health} in ('onTrack', 'atRisk')`))
    .orderBy(sql`abs(${base.variance}) desc`, base.projectId).limit(VARIANCE_LIMIT);

  const priorityProjects = db.select({
    projectId: base.projectId,
    projectName: base.projectName,
    program: base.program,
    region: base.region,
    province: base.province,
    projectType: base.projectType,
    canonicalStatus: base.canonicalStatus,
    allocatedBudget: base.allocatedBudget,
    physicalProgress: base.physicalProgress,
    targetCompletionDate: base.targetCompletionDate,
    daysToTarget: base.daysToTarget,
    scheduleVariance: base.variance,
    health: base.health,
  }).from(base).where(and(filtered, sql`${base.health} in ('delayed', 'atRisk')`))
    .orderBy(
      sql`case when ${base.health} = 'delayed' then 0 else 1 end`,
      sql`case when ${base.health} = 'delayed' then ${base.daysToTarget} end asc nulls last`,
      sql`${base.variance} asc nulls last`,
      sql`${base.allocatedBudget} desc nulls last`,
      base.projectId,
    ).limit(PRIORITY_LIMIT);

  const filterOptions = db.select({
    programs: sql<string[]>`coalesce(array_agg(distinct case when true then ${label(base.program)} end), '{}')`,
    years: sql<string[]>`coalesce(array_agg(distinct case when true then ${label(base.yearFunded)} end), '{}')`,
    regions: sql<string[]>`coalesce(array_agg(distinct case when true then ${label(base.region)} end), '{}')`,
    provinces: sql<string[]>`coalesce(array_agg(distinct case when true then ${label(base.province)} end), '{}')`,
    projectTypes: sql<string[]>`coalesce(array_agg(distinct case when true then ${label(base.projectType)} end), '{}')`,
    statuses: sql<ProjectStatusFilter[]>`coalesce(array_agg(distinct case when true then ${base.canonicalStatus} end), '{}')`,
  }).from(base);

  return [
    { name: "summary", query: summary },
    { name: "scheduleHealth", query: scheduleHealth },
    { name: "statuses", query: statuses },
    { name: "regions", query: regions },
    { name: "projectTypes", query: projectTypes },
    { name: "fundingYears", query: fundingYears },
    { name: "statusByYear", query: statusByYear },
    { name: "regionProjectTypes", query: regionProjectTypes },
    { name: "projectTypeStats", query: projectTypeStats },
    { name: "procurementModes", query: procurementModes },
    { name: "completionDelayBuckets", query: completionDelayBuckets },
    { name: "lateDaysByRegion", query: lateDaysByRegion },
    { name: "lateDaysByProjectType", query: lateDaysByProjectType },
    { name: "lateRateByContractLength", query: lateRateByContractLength },
    { name: "lateRateByYear", query: lateRateByYear },
    { name: "ntpLagByProcurementMode", query: ntpLagByProcurementMode },
    { name: "ongoingOverdueBuckets", query: ongoingOverdueBuckets },
    { name: "ongoingByYear", query: ongoingByYear },
    { name: "turnoverBuckets", query: turnoverBuckets },
    { name: "turnoverByRegion", query: turnoverByRegion },
    { name: "contractors", query: contractors },
    { name: "progressVariance", query: progressVariance },
    { name: "priorityProjects", query: priorityProjects },
    { name: "filterOptions", query: filterOptions },
  ] as const satisfies ReadonlyArray<{ name: DashboardQueryName; query: { toSQL(): unknown } }>;
}

/**
 * Single-level breakdown used by dashboard chart drill-down (region -> province,
 * project type -> program). Reuses the same base/scope/filter pipeline as
 * `buildDashboardAggregateQueryPlan` so role-based scope and every active
 * dashboard filter (including the drilled-into region/projectType, passed in
 * `filters`) apply automatically; only the group-by column changes.
 *
 * Query building is kept separate from execution (mirroring
 * `buildDashboardScopeCountQuery`/`buildDashboardDrillthroughQueryPlan`) so
 * tests can prove this is a grouped, aggregate read via `.toSQL()` without a
 * live database connection.
 */
export function buildDashboardBreakdownQuery(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  asOf: string,
  dimension: DashboardBreakdownDimension,
) {
  const base = dashboardBaseQuery(filters, user, asOf);
  const filtered = filteredBaseCondition(base, filters);
  const label = (column: AnyColumn) => sql<string>`coalesce(nullif(btrim(${column}), ''), ${UNKNOWN})`;
  const column = dimension === "province" ? base.province : base.program;
  const groupLabel = label(column).as(`${dimension}_label`);

  return db
    .select({
      key: groupLabel,
      total: numberSql(sql`count(*)::int`),
      delayed: numberSql(sql`sum(case when ${base.health} = 'delayed' then 1 else 0 end)::int`),
      allocatedBudget: currencySumSql(base.allocatedBudget),
    })
    .from(base)
    .where(filtered)
    .groupBy(groupLabel)
    .orderBy(desc(sql`count(*)`));
}

export async function getDashboardBreakdown(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  dimension: DashboardBreakdownDimension,
): Promise<ManagerialDashboardBreakdownData> {
  const asOf = manilaDateKey(new Date());
  const rows = await buildDashboardBreakdownQuery(filters, user, asOf, dimension);
  return { asOf, dimension, rows };
}

const REGION_COST_MIN_SAMPLE = 5;

/**
 * On-demand only (not part of buildDashboardAggregateQueryPlan): a percentile
 * per (region, one chosen project type) would mean computing it for every one
 * of ~200 types on every dashboard load, most of which nobody looks at. Fetched
 * only once a type is picked, same on-demand shape as buildDashboardBreakdownQuery.
 */
export function buildRegionCostByTypeQuery(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  asOf: string,
  projectType: string,
) {
  const base = dashboardBaseQuery(filters, user, asOf);
  const filtered = filteredBaseCondition(base, filters);
  const label = (column: AnyColumn) => sql<string>`coalesce(nullif(btrim(${column}), ''), ${UNKNOWN})`;
  const regionLabel = label(base.region).as("region_label");
  const matchesType = sql`lower(btrim(${base.projectType})) = lower(btrim(${projectType}))`;
  const withType = and(filtered, matchesType);

  const byRegion = db.select({
    region: regionLabel,
    total: numberSql(sql`count(*)::int`),
    medianBudget: percentileSql(base.allocatedBudget, 0.5),
    p25Budget: percentileSql(base.allocatedBudget, 0.25),
    p75Budget: percentileSql(base.allocatedBudget, 0.75),
  }).from(base).where(withType).groupBy(regionLabel);

  const nationwide = db.select({
    total: numberSql(sql`count(*)::int`),
    medianBudget: percentileSql(base.allocatedBudget, 0.5),
    p25Budget: percentileSql(base.allocatedBudget, 0.25),
    p75Budget: percentileSql(base.allocatedBudget, 0.75),
  }).from(base).where(withType);

  return { byRegion, nationwide };
}

export async function getRegionCostByType(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
  projectType: string,
) {
  const asOf = manilaDateKey(new Date());
  const { byRegion, nationwide } = buildRegionCostByTypeQuery(filters, user, asOf, projectType);
  const [regionRows, nationwideRows] = await Promise.all([byRegion, nationwide]);
  return {
    asOf,
    projectType,
    nationwide: nationwideRows[0] ?? { total: 0, medianBudget: null, p25Budget: null, p75Budget: null },
    regions: regionRows
      .filter((row) => row.region !== UNKNOWN && row.total >= REGION_COST_MIN_SAMPLE)
      .sort((a, b) => (b.medianBudget ?? 0) - (a.medianBudget ?? 0)),
  };
}

function computeExpectedProgressAt(startDate: Date | null, targetDate: Date | null, asOfDateKey: string): number | null {
  if (!startDate || !targetDate) return null;
  const start = startDate.getTime();
  const target = targetDate.getTime();
  const duration = target - start;
  if (duration <= 0) return null;
  const asOf = new Date(`${asOfDateKey}T00:00:00.000Z`).getTime();
  return Math.min(100, Math.max(0, (100 * (asOf - start)) / duration));
}

export async function getProgressCurve(projectId: string, user: ScopedUser) {
  const scopeConditions = getProjectScopeConditions(user);
  const [projectRows, snapshotRows] = await Promise.all([
    db.select({
      projectId: projects.abemisId,
      projectName: projects.name,
      startDate: projects.startDate,
      targetCompletionDate: projects.targetCompletionDate,
    }).from(projects).where(and(eq(projects.abemisId, projectId), ...scopeConditions)).limit(1),
    db.select({
      captureDate: projectMetricSnapshots.captureDate,
      physicalProgress: projectMetricSnapshots.physicalProgress,
    }).from(projectMetricSnapshots)
      .innerJoin(projects, eq(projects.abemisId, projectMetricSnapshots.projectId))
      .where(and(eq(projectMetricSnapshots.projectId, projectId), ...scopeConditions))
      .orderBy(projectMetricSnapshots.captureDate),
  ]);

  const project = projectRows[0];
  if (!project) return null;

  const points = snapshotRows
    .filter((row): row is typeof row & { physicalProgress: number } => row.physicalProgress !== null)
    .map((row) => ({
      date: row.captureDate,
      actualProgress: row.physicalProgress,
      plannedProgress: computeExpectedProgressAt(project.startDate, project.targetCompletionDate, row.captureDate),
    }));

  return {
    projectId: project.projectId,
    projectName: project.projectName,
    points,
  };
}

export function aggregateManagerialDashboardRows(
  sourceRows: DashboardProjectRow[],
  filters: ManagerialDashboardFilters,
  asOf: string,
  freshnessInput: SyncFreshnessInput = {},
): ManagerialDashboardData {
  const allEnrichedRows = sourceRows.map((row) => enrichRow(row, asOf));
  const rows = allEnrichedRows.filter((row) => {
    if (filters.status && row.canonicalStatus !== filters.status) return false;
    if (filters.health && row.health !== filters.health) return false;
    return true;
  });

  const scheduleHealth = (["onTrack", "atRisk", "delayed", "notAssessed"] as const).map(
    (key) => {
      const matching = rows.filter((row) => row.health === key);
      return {
        key,
        count: matching.length,
        budget: sum(matching.map((row) => row.allocatedBudget)),
      };
    },
  );

  const completed = rows.filter((row) => row.canonicalStatus === "completed").length;
  const delayed = rows.filter((row) => row.health === "delayed").length;
  const atRisk = rows.filter((row) => row.health === "atRisk").length;
  const bidOverBudgetRows = rows.filter((row) => {
    const rowBudget = toNumber(row.allocatedBudget);
    const rowBid = toNumber(row.actualBidAmount);
    return rowBudget !== null && rowBid !== null && rowBid > rowBudget;
  });
  const bidExceedsBudgetCount = bidOverBudgetRows.length;
  const bidOverrunTotal = sum(
    bidOverBudgetRows.map((row) => toNumber(row.actualBidAmount)! - toNumber(row.allocatedBudget)!),
  );
  const priorityProjects = rows
    .filter((row) => row.health === "delayed" || row.health === "atRisk")
    .map(toPriorityProject)
    .sort(comparePriorityProjects)
    .slice(0, PRIORITY_LIMIT);

  const regions = groupRows(rows, (row) => normalizedLabel(row.region)).map(
    ([region, groupedRows]) => {
      const regionCompleted = groupedRows.filter(
        (row) => row.canonicalStatus === "completed",
      ).length;
      return {
        region,
        total: groupedRows.length,
        assessed: groupedRows.filter((row) => row.health !== "notAssessed").length,
        completed: regionCompleted,
        delayed: groupedRows.filter((row) => row.health === "delayed").length,
        atRisk: groupedRows.filter((row) => row.health === "atRisk").length,
        completionRate: safePercentage(regionCompleted, groupedRows.length),
        allocatedBudget: sum(groupedRows.map((row) => row.allocatedBudget)),
      };
    },
  );

  const projectTypes = groupRows(rows, (row) => normalizedLabel(row.projectType)).map(
    ([projectType, groupedRows]) => ({
      projectType,
      total: groupedRows.length,
      allocatedBudget: sum(groupedRows.map((row) => row.allocatedBudget)),
      delayed: groupedRows.filter((row) => row.health === "delayed").length,
    }),
  );

  const fundingYears = groupRows(rows, (row) => normalizedLabel(row.yearFunded)).map(
    ([yearFunded, groupedRows]) => {
      const yearCompleted = groupedRows.filter((row) => row.canonicalStatus === "completed").length;
      return {
        yearFunded,
        total: groupedRows.length,
        assessed: groupedRows.filter((row) => row.health !== "notAssessed").length,
        completed: yearCompleted,
        delayed: groupedRows.filter((row) => row.health === "delayed").length,
        completionRate: safePercentage(yearCompleted, groupedRows.length),
        allocatedBudget: sum(groupedRows.map((row) => row.allocatedBudget)),
      };
    },
  );

  const coverage = {
    total: rows.length,
    withBudget: rows.filter((row) => row.allocatedBudget !== null).length,
    withActualBidAmount: rows.filter(
      (row) => row.actualBidAmount !== null,
    ).length,
    withSchedule: rows.filter(
      (row) =>
        row.startDate !== null &&
        row.targetCompletionDate !== null &&
        row.reasonCode !== "missingSchedule" &&
        row.reasonCode !== "invalidSchedule",
    ).length,
    withPhysicalProgress: rows.filter((row) => row.physicalProgress !== null).length,
    withFinancialData: 0,
  };

  const lastSuccessfulSyncAt = freshnessInput.lastSuccessfulSyncAt
    ? new Date(freshnessInput.lastSuccessfulSyncAt).toISOString()
    : null;
  const now = freshnessInput.now ?? new Date();
  const isStale = lastSuccessfulSyncAt
    ? now.getTime() - new Date(lastSuccessfulSyncAt).getTime() > STALE_AFTER_HOURS * 3_600_000
    : true;

  const data: ManagerialDashboardData = {
    asOf,
    freshness: {
      lastSuccessfulSyncAt,
      latestSyncStatus: freshnessInput.latestSyncStatus ?? null,
      isStale,
      staleAfterHours: STALE_AFTER_HOURS,
    },
    coverage,
    kpis: {
      totalProjects: rows.length,
      allocatedBudget: sum(rows.map((row) => row.allocatedBudget)),
      actualBidAmount: sum(
        rows.map((row) => row.actualBidAmount),
      ),
      completionRate: safePercentage(completed, rows.length),
      delayedProjects: delayed,
      atRiskProjects: atRisk,
      bidExceedsBudgetCount,
      bidOverrunTotal,
    },
    scheduleHealth,
    regions: regions.sort((a, b) => {
      const byDelayRate =
        b.delayed / Math.max(b.assessed, 1) - a.delayed / Math.max(a.assessed, 1);
      return byDelayRate || a.region.localeCompare(b.region);
    }),
    projectTypes: projectTypes.sort(
      (a, b) => b.allocatedBudget - a.allocatedBudget || a.projectType.localeCompare(b.projectType),
    ),
    fundingYears: fundingYears.sort((a, b) => a.yearFunded.localeCompare(b.yearFunded, undefined, { numeric: true })),
    progressVariance: rows
      .filter(
        (row) =>
          (row.health === "onTrack" || row.health === "atRisk") &&
          row.expectedProgress !== null &&
          row.physicalProgress !== null &&
          row.variance !== null,
      )
      .sort((a, b) => Math.abs(b.variance ?? 0) - Math.abs(a.variance ?? 0))
      .slice(0, VARIANCE_LIMIT)
      .map((row) => ({
        projectId: row.projectId,
        projectName: row.projectName,
        expectedProgress: round(row.expectedProgress ?? 0),
        physicalProgress: row.physicalProgress ?? 0,
        variance: round(row.variance ?? 0),
        health: row.health,
      })),
    priorityProjects,
    insights: [],
    filterOptions: {
      programs: uniqueSorted(sourceRows.map((row) => row.program)),
      years: uniqueSorted(sourceRows.map((row) => row.yearFunded), true),
      regions: uniqueSorted(sourceRows.map((row) => row.region)),
      provinces: uniqueSorted(sourceRows.map((row) => row.province)),
      projectTypes: uniqueSorted(sourceRows.map((row) => row.projectType)),
      statuses: uniqueSorted(
        allEnrichedRows.map((row) => row.canonicalStatus),
      ) as ProjectStatusFilter[],
    },
    // This aggregator works from an already-loaded row set with no snapshot history
    // available, so it honestly reports no trend rather than fabricating one.
    trend: { status: "insufficientHistory", points: [], sampleCount: 0, spanDays: 0, maxGapDays: 0 },
  };
  const dueSoonCount = rows.filter(
    (row) =>
      row.health === "atRisk" &&
      row.daysToTarget !== null &&
      row.daysToTarget >= 0 &&
      row.daysToTarget <= 30,
  ).length;
  data.insights = generateInsights(data, dueSoonCount);
  return data;
}

export async function getManagerialDashboardData(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
): Promise<ManagerialDashboardData> {
  const now = new Date();
  const asOf = manilaDateKey(now);
  const scopeRows = await buildDashboardScopeCountQuery(filters, user, asOf);
  enforceDashboardRowLimit(scopeRows[0]?.total ?? 0);
  const plan = buildDashboardAggregateQueryPlan(filters, user, asOf);

  const [
    summaryRows,
    scheduleRows,
    statusRows,
    regionRows,
    projectTypeRows,
    fundingYearRows,
    statusByYearRows,
    regionProjectTypeRows,
    projectTypeStatsRows,
    procurementModeRows,
    completionDelayBucketRows,
    lateDaysByRegionRows,
    lateDaysByProjectTypeRows,
    lateRateByContractLengthRows,
    lateRateByYearRows,
    ntpLagByProcurementModeRows,
    ongoingOverdueBucketRows,
    ongoingByYearRows,
    turnoverBucketRows,
    turnoverByRegionRows,
    contractorRows,
    varianceRows,
    priorityRows,
    optionRows,
    latestSyncRows,
    latestSuccessfulRows,
    trendRows,
  ] = await Promise.all([
    plan[0].query,
    plan[1].query,
    plan[2].query,
    plan[3].query,
    plan[4].query,
    plan[5].query,
    plan[6].query,
    plan[7].query,
    plan[8].query,
    plan[9].query,
    plan[10].query,
    plan[11].query,
    plan[12].query,
    plan[13].query,
    plan[14].query,
    plan[15].query,
    plan[16].query,
    plan[17].query,
    plan[18].query,
    plan[19].query,
    plan[20].query,
    plan[21].query,
    plan[22].query,
    plan[23].query,
    db
      .select({ status: syncLogs.status })
      .from(syncLogs)
      .where(eq(syncLogs.resource, "project"))
      .orderBy(desc(syncLogs.startedAt))
      .limit(1),
    db
      .select({ completedAt: syncLogs.completedAt })
      .from(syncLogs)
      .where(and(eq(syncLogs.resource, "project"), eq(syncLogs.status, "completed")))
      .orderBy(desc(syncLogs.completedAt))
      .limit(1),
    buildPortfolioTrendQuery(filters, user, asOf),
  ]);

  const summary = summaryRows[0] ?? {
    total: 0,
    withBudget: 0,
    withActualBidAmount: 0,
    withSchedule: 0,
    withPhysicalProgress: 0,
    allocatedBudget: 0,
    actualBidAmount: 0,
    completed: 0,
    delayed: 0,
    atRisk: 0,
    dueSoon: 0,
    bidExceedsBudgetCount: 0,
    bidOverrunTotal: 0,
  };
  const scheduleByKey = new Map(scheduleRows.map((row) => [row.key, row]));
  const optionRow = optionRows[0] ?? {
    programs: [], years: [], regions: [], provinces: [], projectTypes: [], statuses: [],
  };
  const byLabel = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  const lastSuccessfulSyncAt = latestSuccessfulRows[0]?.completedAt?.toISOString() ?? null;
  const priorityIds = priorityRows.map((row) => row.projectId);
  const snapshotRows = priorityIds.length === 0
    ? []
    : await db
        .select({
          projectId: projectMetricSnapshots.projectId,
          captureDate: projectMetricSnapshots.captureDate,
          physicalProgress: projectMetricSnapshots.physicalProgress,
        })
        .from(projectMetricSnapshots)
        .where(inArray(projectMetricSnapshots.projectId, priorityIds))
        .orderBy(
          projectMetricSnapshots.captureDate,
          projectMetricSnapshots.capturedAt,
        );
  const snapshotsByProject = new Map<string, typeof snapshotRows>();
  for (const snapshot of snapshotRows) {
    const existing = snapshotsByProject.get(snapshot.projectId) ?? [];
    existing.push(snapshot);
    snapshotsByProject.set(snapshot.projectId, existing);
  }

  const data: ManagerialDashboardData = {
    asOf,
    freshness: {
      lastSuccessfulSyncAt,
      latestSyncStatus: latestSyncRows[0]?.status ?? null,
      isStale: lastSuccessfulSyncAt
        ? now.getTime() - new Date(lastSuccessfulSyncAt).getTime() > STALE_AFTER_HOURS * 3_600_000
        : true,
      staleAfterHours: STALE_AFTER_HOURS,
    },
    coverage: {
      total: summary.total,
      withBudget: summary.withBudget,
      withActualBidAmount: summary.withActualBidAmount,
      withSchedule: summary.withSchedule,
      withPhysicalProgress: summary.withPhysicalProgress,
      withFinancialData: 0,
    },
    kpis: {
      totalProjects: summary.total,
      allocatedBudget: summary.allocatedBudget,
      actualBidAmount: summary.actualBidAmount,
      completionRate: safePercentage(summary.completed, summary.total),
      delayedProjects: summary.delayed,
      atRiskProjects: summary.atRisk,
      bidExceedsBudgetCount: summary.bidExceedsBudgetCount,
      bidOverrunTotal: summary.bidOverrunTotal,
    },
    scheduleHealth: (["onTrack", "atRisk", "delayed", "notAssessed"] as const).map((key) => ({
      key,
      count: scheduleByKey.get(key)?.count ?? 0,
      budget: scheduleByKey.get(key)?.budget ?? 0,
    })),
    statusBreakdown: statusRows.map((row) => ({
      key: row.key,
      count: row.count,
      allocatedBudget: row.budget,
    })),
    regions: regionRows.map((row) => ({
      ...row,
      completionRate: safePercentage(row.completed, row.total),
    })).sort((a, b) =>
      b.delayed / Math.max(b.assessed, 1) - a.delayed / Math.max(a.assessed, 1)
      || a.region.localeCompare(b.region)),
    projectTypes: [...projectTypeRows].sort((a, b) =>
      b.allocatedBudget - a.allocatedBudget || a.projectType.localeCompare(b.projectType)),
    fundingYears: fundingYearRows.map((row) => ({
      ...row,
      completionRate: safePercentage(row.completed, row.total),
    })).sort((a, b) => a.yearFunded.localeCompare(b.yearFunded, undefined, { numeric: true })),
    statusByYear: groupStatusByYear(statusByYearRows),
    regionCategories: groupRegionCategories(regionProjectTypeRows),
    commonProjectTypes: buildCommonProjectTypes(projectTypeStatsRows),
    procurementModes: [...procurementModeRows].sort((a, b) => b.allocatedBudget - a.allocatedBudget),
    completionDelayBuckets: zeroFillBuckets(DELAY_BUCKET_ORDER, completionDelayBucketRows, { count: 0 }),
    lateDaysByRegion: lateDaysByRegionRows.filter((row) => row.key !== UNKNOWN && row.totalWithDates >= LATE_DAYS_MIN_SAMPLE),
    lateDaysByProjectType: lateDaysByProjectTypeRows.filter((row) => row.key !== UNKNOWN && row.totalWithDates >= LATE_DAYS_MIN_SAMPLE),
    lateRateByContractLength: zeroFillBuckets(CONTRACT_LENGTH_BUCKET_ORDER, lateRateByContractLengthRows, { lateCount: 0, total: 0 }),
    lateRateByYear: [...lateRateByYearRows].sort((a, b) => a.yearFunded.localeCompare(b.yearFunded, undefined, { numeric: true })),
    ntpLagByProcurementMode: [...ntpLagByProcurementModeRows],
    ongoingOverdueBuckets: zeroFillBuckets(OVERDUE_BUCKET_ORDER, ongoingOverdueBucketRows, { zeroProgress: 0, someProgress: 0 }),
    ongoingByYear: [...ongoingByYearRows].sort((a, b) => a.yearFunded.localeCompare(b.yearFunded, undefined, { numeric: true })),
    turnoverBacklog: {
      buckets: zeroFillBuckets(TURNOVER_BUCKET_ORDER, turnoverBucketRows, { count: 0 }),
      byRegion: turnoverByRegionRows.filter((row) => row.region !== UNKNOWN).sort((a, b) => b.waiting - a.waiting),
    },
    contractors: contractorRows
      .filter((row) => row.projectsChecked >= CONTRACTOR_MIN_PROJECTS)
      .sort((a, b) => b.projectsChecked - a.projectsChecked),
    progressVariance: varianceRows.map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      expectedProgress: round(Number(row.expectedProgress ?? 0)),
      physicalProgress: Number(row.physicalProgress ?? 0),
      variance: round(Number(row.variance ?? 0)),
      health: row.health,
    })),
    priorityProjects: priorityRows.map((row) => {
      const daysToTarget = row.daysToTarget === null ? null : Number(row.daysToTarget);
      const scheduleVariance = row.scheduleVariance === null ? null : round(Number(row.scheduleVariance));
      const health = row.health;
      return {
        projectId: row.projectId,
        projectName: row.projectName,
        program: normalizedLabel(row.program),
        region: row.region,
        province: row.province,
        projectType: normalizedLabel(row.projectType),
        allocatedBudget: toNumber(row.allocatedBudget),
        physicalProgress: row.physicalProgress === null ? null : Number(row.physicalProgress),
        targetCompletionDate: row.targetCompletionDate?.toISOString() ?? null,
        daysToTarget,
        scheduleVariance,
        health,
        reason: health === "delayed"
          ? `${Math.abs(daysToTarget ?? 0)} days overdue`
          : daysToTarget !== null && daysToTarget >= 0 && daysToTarget <= 30 && Number(row.physicalProgress) < 80
            ? `Due within ${daysToTarget} days below 80% progress`
            : `${Math.round(Math.abs(scheduleVariance ?? 0))} points behind schedule`,
        forecast: calculateCompletionForecast({
          status: row.canonicalStatus,
          targetCompletionDate: row.targetCompletionDate,
          snapshots: snapshotsByProject.get(row.projectId) ?? [],
        }),
      };
    }),
    insights: [],
    filterOptions: {
      programs: [...optionRow.programs].sort(byLabel),
      years: [...optionRow.years].sort((a, b) => byLabel(b, a)),
      regions: [...optionRow.regions].sort(byLabel),
      provinces: [...optionRow.provinces].sort(byLabel),
      projectTypes: [...optionRow.projectTypes].sort(byLabel),
      statuses: [...optionRow.statuses].sort(byLabel),
    },
    trend: aggregatePortfolioTrendRows(trendRows),
  };
  data.insights = generateInsights(data, summary.dueSoon);
  return data;
}

function enrichRow(row: DashboardProjectRow, asOf: string): EnrichedRow {
  const physicalProgress = row.hasPhysicalProgressEvidence ? row.physicalProgress : null;
  const health = classifyScheduleHealth(
    {
      status: row.status,
      startDate: row.startDate,
      targetCompletionDate: row.targetCompletionDate,
      actualCompletionDate: row.actualCompletionDate,
      physicalProgress,
    },
    asOf,
  );
  return {
    ...row,
    physicalProgress,
    canonicalStatus: canonicalStatus(row.status),
    health: health.health,
    expectedProgress: health.expectedProgress,
    variance: health.variance,
    daysToTarget: health.daysToTarget,
    reasonCode: health.reasonCode,
  };
}

function canonicalStatus(status: string | null): ProjectStatusFilter {
  if (status?.trim().toLowerCase() === "suspended") return "suspended";
  const stage = mapInternalToPublicStage(status);
  if (stage === "Completed") return "completed";
  if (stage === "On going") return "ongoing";
  return "planned";
}

const TREND_DAY_MS = 86_400_000;
const TREND_MIN_SAMPLES = 3;
const TREND_MIN_SPAN_DAYS = 14;
const TREND_MAX_GAP_DAYS = 7;
const TREND_LOOKBACK_DAYS = 60;

// Snapshots are only captured for non-completed projects (activeSnapshotCondition in
// project-metric-snapshots.ts drops "completed"/"inventory" rows before insert), so a
// completion-rate trend derived from this table would read 0% forever by construction.
// Average physical progress of the active pipeline is what this data can honestly show.
//
// Filters use as-captured snapshot columns (a project's region/program at the time of
// capture), per the historical-filter contract in docs/dashboard-kpi-definitions.md.
// Authorization scope still uses the project's current region/program via the join.
//
// Bounded to the last TREND_LOOKBACK_DAYS: without a bound, one isolated pre-fix
// snapshot (e.g. from a run of sync failures) would sit in the data forever and create a
// permanent gap larger than TREND_MAX_GAP_DAYS, keeping the trend "insufficient" even
// after months of clean daily history. The window lets an old gap eventually age out.
export function buildPortfolioTrendQuery(filters: ManagerialDashboardFilters, user: ScopedUser, asOf: string = manilaDateKey(new Date())) {
  const cutoff = new Date(`${asOf}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - TREND_LOOKBACK_DAYS);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const conditions = [...getProjectScopeConditions(user), gte(projectMetricSnapshots.captureDate, cutoffDate)];
  if (filters.program) conditions.push(dimensionCondition(projectMetricSnapshots.program, filters.program, false));
  if (filters.year) conditions.push(dimensionCondition(projectMetricSnapshots.yearFunded, filters.year, false));
  if (filters.region) conditions.push(dimensionCondition(projectMetricSnapshots.region, filters.region, true));
  if (filters.province) conditions.push(dimensionCondition(projectMetricSnapshots.province, filters.province, true));
  if (filters.projectType) conditions.push(dimensionCondition(projectMetricSnapshots.projectType, filters.projectType, true));

  return db
    .select({
      date: projectMetricSnapshots.captureDate,
      averageProgress: numberSql(sql`coalesce(avg(${projectMetricSnapshots.physicalProgress}), 0)`),
      sampleSize: numberSql(sql`count(${projectMetricSnapshots.physicalProgress})::int`),
      total: numberSql(sql`count(*)::int`),
    })
    .from(projectMetricSnapshots)
    .innerJoin(projects, eq(projects.abemisId, projectMetricSnapshots.projectId))
    .where(and(...conditions))
    .groupBy(projectMetricSnapshots.captureDate)
    .orderBy(projectMetricSnapshots.captureDate);
}

function daysBetween(later: string, earlier: string) {
  return Math.round((new Date(later).getTime() - new Date(earlier).getTime()) / TREND_DAY_MS);
}

export function aggregatePortfolioTrendRows(
  rows: Array<{ date: string; averageProgress: number; sampleSize: number; total: number }>,
): ManagerialDashboardData["trend"] {
  const allPoints = rows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      date: row.date,
      averageProgress: round(row.averageProgress),
      sampleSize: row.sampleSize,
      total: row.total,
    }));

  // Only the most recent unbroken run (no gap over TREND_MAX_GAP_DAYS between consecutive
  // dates) is used. An older, isolated point separated by a large gap (e.g. left over from
  // a prior run of sync failures) is dropped entirely, rather than either drawing a
  // misleading line across the gap or letting that old point block readiness once the
  // recent run is already long enough to stand on its own.
  let start = allPoints.length - 1;
  while (start > 0 && daysBetween(allPoints[start].date, allPoints[start - 1].date) <= TREND_MAX_GAP_DAYS) {
    start -= 1;
  }
  const points = allPoints.slice(Math.max(start, 0));

  const sampleCount = points.length;
  const spanDays = sampleCount >= 2 ? daysBetween(points.at(-1)!.date, points[0].date) : 0;
  const maxGapDays = sampleCount >= 2
    ? Math.max(...points.slice(1).map((point, index) => daysBetween(point.date, points[index].date)))
    : 0;

  const status: ManagerialDashboardData["trend"]["status"] =
    sampleCount < TREND_MIN_SAMPLES || spanDays < TREND_MIN_SPAN_DAYS
      ? "insufficientHistory"
      : "ready";

  return { status, points, sampleCount, spanDays, maxGapDays };
}

export async function getPortfolioProgressTrend(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
): Promise<ManagerialDashboardData["trend"]> {
  const rows = await buildPortfolioTrendQuery(filters, user);
  return aggregatePortfolioTrendRows(rows);
}

function toPriorityProject(
  row: EnrichedRow,
): ManagerialDashboardData["priorityProjects"][number] {
  const budget = toNumber(row.allocatedBudget);
  const target = row.targetCompletionDate
    ? new Date(row.targetCompletionDate).toISOString()
    : null;
  return {
    projectId: row.projectId,
    projectName: row.projectName,
    program: normalizedLabel(row.program),
    region: row.region,
    province: row.province,
    projectType: normalizedLabel(row.projectType),
    allocatedBudget: budget,
    physicalProgress: row.physicalProgress,
    targetCompletionDate: target,
    daysToTarget: row.daysToTarget,
    scheduleVariance: row.variance === null ? null : round(row.variance),
    health: row.health,
    reason:
      row.health === "delayed"
        ? `${Math.abs(row.daysToTarget ?? 0)} days overdue`
        : row.reasonCode === "dueSoonLowProgress"
          ? `Due within ${Math.max(row.daysToTarget ?? 0, 0)} days below 80% progress`
          : `${Math.round(Math.abs(row.variance ?? 0))} points behind schedule`,
    forecast: calculateCompletionForecast({
      status: row.status,
      targetCompletionDate: row.targetCompletionDate,
      snapshots: [],
    }),
  };
}

export function comparePriorityProjects(
  a: ManagerialDashboardData["priorityProjects"][number],
  b: ManagerialDashboardData["priorityProjects"][number],
) {
  const healthRank = (health: ScheduleHealth) => (health === "delayed" ? 0 : 1);
  const byHealth = healthRank(a.health) - healthRank(b.health);
  if (byHealth !== 0) return byHealth;
  if (a.health === "delayed" && b.health === "delayed") {
    const byOverdueDays = Math.abs(b.daysToTarget ?? 0) - Math.abs(a.daysToTarget ?? 0);
    if (byOverdueDays !== 0) return byOverdueDays;
  }
  const byDeficit = (a.scheduleVariance ?? 0) - (b.scheduleVariance ?? 0);
  if (byDeficit !== 0) return byDeficit;
  const byBudget = (b.allocatedBudget ?? 0) - (a.allocatedBudget ?? 0);
  if (byBudget !== 0) return byBudget;
  return a.projectId.localeCompare(b.projectId);
}

function generateInsights(
  data: ManagerialDashboardData,
  dueSoon: number,
): ManagerialDashboardData["insights"] {
  const insights: ManagerialDashboardData["insights"] = [];
  const exposedBudget = data.scheduleHealth
    .filter((entry) => entry.key === "delayed" || entry.key === "atRisk")
    .reduce((total, entry) => total + entry.budget, 0);
  if (exposedBudget > 0) {
    insights.push({
      severity: "critical",
      title: "Budget exposure needs attention",
      detail: `${formatCurrency(exposedBudget)} is allocated to delayed or at-risk projects.`,
    });
  }

  const regionalBottleneck = data.regions
    .filter((region) => region.assessed >= REGIONAL_INSIGHT_MINIMUM && region.delayed > 0)
    .sort(
      (a, b) =>
        b.delayed / b.assessed - a.delayed / a.assessed ||
        a.region.localeCompare(b.region),
    )[0];
  if (regionalBottleneck) {
    insights.push({
      severity: "warning",
      title: `${regionalBottleneck.region} has the highest delayed-project rate`,
      detail: `${regionalBottleneck.delayed} of ${regionalBottleneck.assessed} assessed projects are delayed.`,
      filter: { region: regionalBottleneck.region, health: "delayed" },
    });
  }

  if (dueSoon > 0) {
    insights.push({
      severity: "warning",
      title: "Projects approaching target dates",
      detail: `${dueSoon} priority ${dueSoon === 1 ? "project is" : "projects are"} due within 30 days.`,
    });
  }

  const scheduleCoverage = safePercentage(data.coverage.withSchedule, data.coverage.total);
  if (data.coverage.total > 0 && scheduleCoverage < 80) {
    insights.push({
      severity: "warning",
      title: "Schedule-data coverage is limited",
      detail: `${round(scheduleCoverage)}% of projects have assessable schedule dates.`,
      filter: { health: "notAssessed" },
    });
  }
  return insights.slice(0, 3);
}

function groupRows<T>(rows: T[], key: (row: T) => string): Array<[string, T[]]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    grouped.set(value, [...(grouped.get(value) ?? []), row]);
  }
  return [...grouped.entries()];
}

function normalizedLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || UNKNOWN;
}

export function hasReportedPhysicalProgress(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const rows = (metadata as { powRelation?: unknown }).powRelation;
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => {
    if (!row || typeof row !== "object") return false;
    const actual = (row as { actual?: unknown }).actual;
    if (actual === null || actual === undefined || actual === "") return false;
    return Number.isFinite(Number(String(actual).replace(/,/g, "")));
  });
}

function uniqueSorted(values: Array<string | null>, descending = false) {
  const sorted = [...new Set(values.map(normalizedLabel))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  return descending ? sorted.reverse() : sorted;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sumCurrency(values: Array<string | number | null | undefined>) {
  const totalCents = values.reduce<bigint>((total, value) => {
    if (value === null || value === undefined) return total;
    const normalized = String(value).trim().replace(/,/g, "");
    const match = normalized.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!match) return total;
    const sign = match[1] === "-" ? BigInt(-1) : BigInt(1);
    const fraction = (match[3] ?? "").padEnd(3, "0");
    const roundedCents = BigInt(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? BigInt(1) : BigInt(0));
    return total + sign * (BigInt(match[2]) * BigInt(100) + roundedCents);
  }, BigInt(0));
  return Number(totalCents) / 100;
}

function sum(values: Array<string | number | null | undefined>) {
  return sumCurrency(values);
}

function safePercentage(numerator: number, denominator: number) {
  return denominator > 0 ? round((numerator / denominator) * 100) : 0;
}

function emptyStatusRecord(): Record<ProjectStatusFilter, number> {
  return Object.fromEntries(
    PROJECT_STATUS_FILTER_VALUES.map((status) => [status, 0]),
  ) as Record<ProjectStatusFilter, number>;
}

function groupStatusByYear(
  rows: Array<{ yearFunded: string; status: ProjectStatusFilter; count: number; budget: number }>,
) {
  const byYear = new Map<string, { counts: Record<ProjectStatusFilter, number>; allocatedBudget: Record<ProjectStatusFilter, number> }>();
  for (const row of rows) {
    const entry = byYear.get(row.yearFunded) ?? {
      counts: emptyStatusRecord(),
      allocatedBudget: emptyStatusRecord(),
    };
    entry.counts[row.status] = row.count;
    entry.allocatedBudget[row.status] = row.budget;
    byYear.set(row.yearFunded, entry);
  }
  return Array.from(byYear.entries())
    .map(([yearFunded, entry]) => ({ yearFunded, ...entry }))
    .sort((a, b) => a.yearFunded.localeCompare(b.yearFunded, undefined, { numeric: true }));
}

// Fills in every bucket in `order`, even ones the grouped query returned no
// rows for, so charts always render a fixed, complete set of buckets instead
// of silently dropping a zero-count one.
function zeroFillBuckets<Bucket extends string, Fields extends Record<string, number>>(
  order: readonly Bucket[],
  rows: Array<{ bucket: string } & Fields>,
  empty: Fields,
): Array<{ bucket: Bucket } & Fields> {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  return order.map((bucket) => ({ bucket, ...(byBucket.get(bucket) as Fields | undefined) ?? empty }));
}

const FACILITY_CATEGORIES = [...FARM_OPERATIONS, UNCLASSIFIED_CATEGORY];

function emptyCategoryRecord(): Record<string, { count: number; budget: number }> {
  return Object.fromEntries(FACILITY_CATEGORIES.map((category) => [category, { count: 0, budget: 0 }]));
}

// The 9-value facility category comes from the APSAM infrastructure-categorization
// reference (lib/abemis/project-type-map.ts), a JS lookup keyed by raw project type —
// not queryable in SQL — so rows are grouped by (region, projectType) in the database
// and re-bucketed into (region, category) here.
function groupRegionCategories(
  rows: Array<{ region: string; projectType: string; count: number; budget: number }>,
) {
  const byRegion = new Map<string, Record<string, { count: number; budget: number }>>();
  for (const row of rows) {
    const category = getProjectTypeMapping(row.projectType)?.farmOperation ?? UNCLASSIFIED_CATEGORY;
    const entry = byRegion.get(row.region) ?? emptyCategoryRecord();
    entry[category] = { count: entry[category].count + row.count, budget: entry[category].budget + row.budget };
    byRegion.set(row.region, entry);
  }
  return Array.from(byRegion.entries())
    .map(([region, categories]) => ({ region, categories }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

function buildCommonProjectTypes(
  rows: Array<{
    projectType: string;
    total: number;
    allocatedBudget: number;
    medianBudget: number | null;
    p25Budget: number | null;
    p75Budget: number | null;
  }>,
) {
  return [...rows]
    .sort((a, b) => b.total - a.total || a.projectType.localeCompare(b.projectType))
    .slice(0, COMMON_TYPES_LIMIT)
    .map((row) => ({
      projectType: row.projectType,
      category: getProjectTypeMapping(row.projectType)?.farmOperation ?? null,
      total: row.total,
      allocatedBudget: row.allocatedBudget,
      medianBudget: row.medianBudget,
      p25Budget: row.p25Budget,
      p75Budget: row.p75Budget,
    }));
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function manilaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
