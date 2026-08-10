import { and, desc, eq, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { projectMetricSnapshots, projects } from "@/lib/db/schema";
import type { ScopedUser } from "@/lib/scope";
import type { ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";
import { buildDashboardConditions, currencyFromCents } from "./managerial-dashboard-query";

export type ManagerialDashboardChanges =
  | {
      available: false;
      reason: string;
    }
  | {
      available: true;
      fromDate: string;
      toDate: string;
      projectCountDelta: number;
      averagePhysicalProgressDelta: number | null;
      allocatedBudgetDelta: number | null;
    };

function snapshotDimensionCondition(
  column: AnyColumn,
  value: string | undefined,
): SQL | undefined {
  if (!value) return undefined;
  return value === "Unknown"
    ? sql`(${column} is null or btrim(${column}) = '')`
    : eq(column, value);
}

export function buildSnapshotFilterConditions(filters: ManagerialDashboardFilters) {
  return [
    snapshotDimensionCondition(projectMetricSnapshots.program, filters.program),
    snapshotDimensionCondition(projectMetricSnapshots.yearFunded, filters.year),
    snapshotDimensionCondition(projectMetricSnapshots.region, filters.region),
    snapshotDimensionCondition(projectMetricSnapshots.province, filters.province),
    snapshotDimensionCondition(projectMetricSnapshots.projectType, filters.projectType),
  ].filter((condition): condition is SQL => Boolean(condition));
}

export async function getManagerialDashboardChanges(
  filters: ManagerialDashboardFilters,
  user: ScopedUser,
): Promise<ManagerialDashboardChanges> {
  if (filters.status || filters.health) {
    return {
      available: false,
      reason: "Historical changes are unavailable with status or schedule-health filters because those classifications are evaluated as of each snapshot.",
    };
  }

  // Authorization follows the user's current server-derived scope. Dashboard
  // dimensions use values captured with each snapshot so historical membership
  // is not rewritten when a project is later reclassified.
  const authorizationConditions = buildDashboardConditions({}, user);
  const snapshotFilterConditions = buildSnapshotFilterConditions(filters);
  const scoped = and(...authorizationConditions, ...snapshotFilterConditions);
  const dates = await db
    .select({ captureDate: projectMetricSnapshots.captureDate })
    .from(projectMetricSnapshots)
    .innerJoin(projects, eq(projects.abemisId, projectMetricSnapshots.projectId))
    .where(scoped)
    .groupBy(projectMetricSnapshots.captureDate)
    .orderBy(desc(projectMetricSnapshots.captureDate))
    .limit(2);

  if (dates.length < 2) {
    return {
      available: false,
      reason: "Insufficient snapshot history; two distinct capture dates are required.",
    };
  }

  const dateKeys = dates.map((row) => row.captureDate);
  const rows = await db
    .select({
      captureDate: projectMetricSnapshots.captureDate,
      projectCount: sql<number>`count(*)::int`.mapWith(Number),
      averagePhysicalProgress:
        sql<number | null>`avg(${projectMetricSnapshots.physicalProgress})::double precision`,
      allocatedBudget:
        sql<number | null>`case
          when count(${projectMetricSnapshots.budget}) = 0 then null
          else round(sum(${projectMetricSnapshots.budget}) * 100)::bigint
        end`.mapWith((value) => value === null ? null : currencyFromCents(value)),
    })
    .from(projectMetricSnapshots)
    .innerJoin(projects, eq(projects.abemisId, projectMetricSnapshots.projectId))
    .where(
      and(
        inArray(projectMetricSnapshots.captureDate, dateKeys),
        ...authorizationConditions,
        ...snapshotFilterConditions,
      ),
    )
    .groupBy(projectMetricSnapshots.captureDate);

  const byDate = new Map(rows.map((row) => [row.captureDate, row]));
  const current = byDate.get(dateKeys[0]!);
  const previous = byDate.get(dateKeys[1]!);
  if (!current || !previous) {
    return { available: false, reason: "Snapshot aggregates are incomplete." };
  }

  return {
    available: true,
    fromDate: dateKeys[1]!,
    toDate: dateKeys[0]!,
    projectCountDelta: current.projectCount - previous.projectCount,
    averagePhysicalProgressDelta: nullableDelta(
      current.averagePhysicalProgress,
      previous.averagePhysicalProgress,
    ),
    allocatedBudgetDelta: nullableDelta(
      current.allocatedBudget,
      previous.allocatedBudget,
      2,
    ),
  };
}

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

export function nullableDelta(
  current: number | null,
  previous: number | null,
  digits = 4,
) {
  return current === null || previous === null
    ? null
    : round(current - previous, digits);
}
