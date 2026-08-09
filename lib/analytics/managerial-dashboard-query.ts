import { and, desc, eq, ilike, type SQL } from "drizzle-orm";

import { mapInternalToPublicStage } from "@/constants/stage-mapping";
import { db } from "@/lib/db";
import { projects, syncLogs } from "@/lib/db/schema";
import { getProjectScopeConditions, type ScopedUser } from "@/lib/scope";
import type {
  ManagerialDashboardData,
  ManagerialDashboardFilters,
  ProjectStatusFilter,
  ScheduleHealth,
} from "@/types/managerial-dashboard.types";
import { classifyScheduleHealth } from "./schedule-health";

const UNKNOWN = "Unknown";
const STALE_AFTER_HOURS = 26;
const PRIORITY_LIMIT = 10;
const VARIANCE_LIMIT = 50;
const REGIONAL_INSIGHT_MINIMUM = 5;

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
  approvedBudgetForContract: string | number | null;
  physicalProgress: number | null;
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
  if (filters.program) conditions.push(eq(projects.program, filters.program));
  if (filters.year) conditions.push(eq(projects.yearFunded, filters.year));
  if (filters.region) conditions.push(ilike(projects.region, filters.region));
  if (filters.province) conditions.push(ilike(projects.province, filters.province));
  if (filters.projectType) conditions.push(ilike(projects.projectType, filters.projectType));
  // Canonical status and schedule health use shared domain classifiers after retrieval.
  return conditions;
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

  const coverage = {
    total: rows.length,
    withBudget: rows.filter((row) => row.allocatedBudget !== null).length,
    withSchedule: rows.filter(
      (row) =>
        row.startDate !== null &&
        row.targetCompletionDate !== null &&
        row.reasonCode !== "missingSchedule" &&
        row.reasonCode !== "invalidSchedule",
    ).length,
    withPhysicalProgress: rows.filter(
      (row) =>
        row.physicalProgress !== null &&
        Number.isFinite(row.physicalProgress) &&
        row.physicalProgress >= 0 &&
        row.physicalProgress <= 100,
    ).length,
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
      approvedBudgetForContract: sum(
        rows.map((row) => row.approvedBudgetForContract),
      ),
      completionRate: safePercentage(completed, rows.length),
      delayedProjects: delayed,
      atRiskProjects: atRisk,
    },
    scheduleHealth,
    regions: regions.sort(
      (a, b) => b.delayed / Math.max(b.total, 1) - a.delayed / Math.max(a.total, 1),
    ),
    projectTypes: projectTypes.sort(
      (a, b) => b.allocatedBudget - a.allocatedBudget || a.projectType.localeCompare(b.projectType),
    ),
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
  };
  data.insights = generateInsights(data);
  return data;
}

export async function getManagerialDashboardData(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
): Promise<ManagerialDashboardData> {
  const asOf = manilaDateKey(new Date());
  const conditions = buildDashboardConditions(filters, user);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, latestSyncRows, latestSuccessfulRows] = await Promise.all([
    db
      .select({
        projectId: projects.abemisId,
        projectName: projects.name,
        program: projects.program,
        region: projects.region,
        province: projects.province,
        projectType: projects.projectType,
        yearFunded: projects.yearFunded,
        status: projects.status,
        allocatedBudget: projects.budget,
        approvedBudgetForContract: projects.abc,
        physicalProgress: projects.physicalProgress,
        startDate: projects.startDate,
        targetCompletionDate: projects.targetCompletionDate,
        actualCompletionDate: projects.actualCompletionDate,
        lastSyncedAt: projects.lastSyncedAt,
      })
      .from(projects)
      .where(where),
    db
      .select({ status: syncLogs.status })
      .from(syncLogs)
      .where(eq(syncLogs.resource, "project"))
      .orderBy(desc(syncLogs.startedAt))
      .limit(1),
    db
      .select({ completedAt: syncLogs.completedAt })
      .from(syncLogs)
      .where(
        and(eq(syncLogs.resource, "project"), eq(syncLogs.status, "completed")),
      )
      .orderBy(desc(syncLogs.completedAt))
      .limit(1),
  ]);

  return aggregateManagerialDashboardRows(rows, filters, asOf, {
    lastSuccessfulSyncAt: latestSuccessfulRows[0]?.completedAt ?? null,
    latestSyncStatus: latestSyncRows[0]?.status ?? null,
  });
}

function enrichRow(row: DashboardProjectRow, asOf: string): EnrichedRow {
  const health = classifyScheduleHealth(
    {
      status: row.status,
      startDate: row.startDate,
      targetCompletionDate: row.targetCompletionDate,
      actualCompletionDate: row.actualCompletionDate,
      physicalProgress: row.physicalProgress,
    },
    asOf,
  );
  return {
    ...row,
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
  };
}

export function comparePriorityProjects(
  a: ManagerialDashboardData["priorityProjects"][number],
  b: ManagerialDashboardData["priorityProjects"][number],
) {
  const healthRank = (health: ScheduleHealth) => (health === "delayed" ? 0 : 1);
  const byHealth = healthRank(a.health) - healthRank(b.health);
  if (byHealth !== 0) return byHealth;
  const byDeficit = (a.scheduleVariance ?? 0) - (b.scheduleVariance ?? 0);
  if (byDeficit !== 0) return byDeficit;
  return (b.allocatedBudget ?? 0) - (a.allocatedBudget ?? 0);
}

function generateInsights(
  data: ManagerialDashboardData,
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
    .filter((region) => region.total >= REGIONAL_INSIGHT_MINIMUM && region.delayed > 0)
    .sort((a, b) => b.delayed / b.total - a.delayed / a.total)[0];
  if (regionalBottleneck) {
    insights.push({
      severity: "warning",
      title: `${regionalBottleneck.region} has the highest delayed-project rate`,
      detail: `${regionalBottleneck.delayed} of ${regionalBottleneck.total} projects are delayed.`,
      filter: { region: regionalBottleneck.region, health: "delayed" },
    });
  }

  const dueSoon = data.priorityProjects.filter(
    (project) =>
      project.daysToTarget !== null &&
      project.daysToTarget >= 0 &&
      project.daysToTarget <= 30,
  ).length;
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

function sum(values: Array<string | number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (toNumber(value) ?? 0), 0);
}

function safePercentage(numerator: number, denominator: number) {
  return denominator > 0 ? round((numerator / denominator) * 100) : 0;
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
