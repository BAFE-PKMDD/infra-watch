import { and, eq, exists, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { issues, projects } from "@/lib/db/schema";
import { hasAssignedModeratorScope, normalizedAssignment, type ScopedUser } from "@/lib/moderator-scope";
import { projectYearScopeCondition } from "@/lib/abemis/year-scope";

export type { ScopedUser } from "@/lib/moderator-scope";
export { hasAssignedModeratorScope } from "@/lib/moderator-scope";

type ScopeResult = { allowed: true } | { allowed: false; reason: string };

function isScopedModerator(user: ScopedUser) {
  return user.role === "moderator" && hasAssignedModeratorScope(user);
}

// `region` is the same free-text value stored in projects.region (e.g. "Bicol Region
// (Region V)"), assigned to a moderator from the distinct values actually present on
// projects — not a PSGC code. PSGC region codes were tried here previously, but the
// psgc_locations reference data assigns the same region_code to more than one region
// (BARMM and SOCCSKSARGEN both have rows with region_code "19"), and a project's own
// psgc_code is unreliable ABEMIS-sourced data that frequently doesn't even match its own
// region (e.g. most BARMM projects carry a pre-2019 ARMM-era psgc_code prefix, not
// BARMM's own code) — so prefix-matching against psgc_code both under- and over-matched.
export function projectRegionCondition(region: string): SQL {
  return ilike(projects.region, region);
}

function projectAgencyCondition(agency: string): SQL {
  return eq(projects.program, agency);
}

export function getProjectScopeConditions(user: ScopedUser): SQL[] {
  const conditions: SQL[] = [projectYearScopeCondition()];

  if (user.role !== "moderator") {
    return conditions;
  }

  if (!hasAssignedModeratorScope(user)) {
    return [sql`false`];
  }

  const region = normalizedAssignment(user.region);
  const assignedAgency = normalizedAssignment(user.assignedAgency);

  if (region) {
    conditions.push(projectRegionCondition(region));
  }

  if (assignedAgency) {
    conditions.push(projectAgencyCondition(assignedAgency));
  }

  return conditions;
}

export async function checkModeratorScope(
  user: ScopedUser,
  projectId: string | null | undefined,
): Promise<ScopeResult> {
  if (user.role === "admin" || user.role !== "moderator" || !projectId) {
    return { allowed: true };
  }

  if (!hasAssignedModeratorScope(user)) {
    return { allowed: false, reason: "Moderator scope is not assigned" };
  }

  const projectIdentityConditions = [
    eq(projects.abemisId, projectId),
    eq(projects.projectCode, projectId),
    sql`${projects.id}::text = ${projectId}`,
  ];

  const [match] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(or(...projectIdentityConditions)!, ...getProjectScopeConditions(user)))
    .limit(1);

  if (match) {
    return { allowed: true };
  }

  if (user.region && user.assignedAgency) {
    return { allowed: false, reason: "This resource is outside your assigned region and program" };
  }

  if (user.region) {
    return { allowed: false, reason: "This resource is outside your assigned region" };
  }

  return { allowed: false, reason: "This resource is outside your assigned program" };
}

export async function getIssueScopeCondition(user: ScopedUser): Promise<SQL | undefined> {
  if (user.role === "moderator" && !hasAssignedModeratorScope(user)) {
    return sql`false`;
  }

  if (!isScopedModerator(user)) {
    return undefined;
  }

  if (user.assignedAgency) {
    const linkedConditions = [
      eq(projects.abemisId, issues.projectId),
      projectAgencyCondition(user.assignedAgency),
    ];

    if (user.region) {
      linkedConditions.push(projectRegionCondition(user.region));
    }

    return exists(db.select({ id: projects.id }).from(projects).where(and(...linkedConditions)));
  }

  if (user.region) {
    return or(
      exists(
        db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.abemisId, issues.projectId), projectRegionCondition(user.region))),
      ),
      and(sql`${issues.projectId} IS NULL`, ilike(issues.region, user.region)),
    )!;
  }

  return undefined;
}

export async function checkIssueScope(
  user: ScopedUser,
  issue: { projectId?: string | null; region?: string | null },
): Promise<ScopeResult> {
  if (user.role === "moderator" && !hasAssignedModeratorScope(user)) {
    return { allowed: false, reason: "Moderator scope is not assigned" };
  }

  if (!isScopedModerator(user)) {
    return { allowed: true };
  }

  if (issue.projectId) {
    return checkModeratorScope(user, issue.projectId);
  }

  if (user.assignedAgency) {
    return { allowed: false, reason: "This issue is not linked to your assigned program" };
  }

  if (!user.region) {
    return { allowed: true };
  }

  const normalizedIssueRegion = issue.region?.trim().toLowerCase();

  if (normalizedIssueRegion && normalizedIssueRegion === user.region.trim().toLowerCase()) {
    return { allowed: true };
  }

  return { allowed: false, reason: "This issue is outside your assigned region" };
}
