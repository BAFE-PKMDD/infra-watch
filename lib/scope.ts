import { and, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { issues, projects, psgcLocations } from "@/lib/db/schema";

export type ScopedUser = {
  role?: string | null;
  region?: string | null;
  assignedAgency?: string | null;
};

type ScopeResult = { allowed: true } | { allowed: false; reason: string };

function isScopedModerator(user: ScopedUser) {
  return user.role === "moderator" && (Boolean(user.region) || Boolean(user.assignedAgency));
}

function projectRegionCondition(region: string): SQL {
  return or(
    ilike(projects.psgcCode, `${region}%`),
    ilike(projects.region, region),
  )!;
}

function projectAgencyCondition(agency: string): SQL {
  return eq(projects.program, agency);
}

export function getProjectScopeConditions(user: ScopedUser): SQL[] {
  if (user.role !== "moderator") {
    return [];
  }

  const conditions: SQL[] = [];

  if (user.region) {
    conditions.push(projectRegionCondition(user.region));
  }

  if (user.assignedAgency) {
    conditions.push(projectAgencyCondition(user.assignedAgency));
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

  if (!isScopedModerator(user)) {
    return { allowed: true };
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

async function getRegionNames(regionCode: string) {
  const rows = await db
    .select({ name: psgcLocations.regionName, shortname: psgcLocations.regionShortname })
    .from(psgcLocations)
    .where(eq(psgcLocations.regionCode, regionCode));

  return Array.from(new Set(rows.flatMap((row) => [row.name, row.shortname]).filter(Boolean) as string[]));
}

export async function getIssueScopeCondition(user: ScopedUser): Promise<SQL | undefined> {
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
    const regionNames = await getRegionNames(user.region);
    const issueRegionConditions: SQL[] = [
      eq(issues.region, user.region),
      ilike(issues.region, user.region),
    ];

    if (regionNames.length > 0) {
      issueRegionConditions.push(inArray(issues.region, regionNames));
      issueRegionConditions.push(...regionNames.map((name) => ilike(issues.region, `%${name}%`)));
    }

    return or(
      exists(
        db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.abemisId, issues.projectId), projectRegionCondition(user.region))),
      ),
      and(sql`${issues.projectId} IS NULL`, or(...issueRegionConditions)!),
    )!;
  }

  return undefined;
}

export async function checkIssueScope(
  user: ScopedUser,
  issue: { projectId?: string | null; region?: string | null },
): Promise<ScopeResult> {
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

  const regionNames = await getRegionNames(user.region);
  const issueRegion = issue.region?.trim();
  const normalizedIssueRegion = issueRegion?.toLowerCase();

  if (
    normalizedIssueRegion &&
    (
      normalizedIssueRegion === user.region.toLowerCase() ||
      regionNames.some((name) => {
        const normalizedName = name.toLowerCase();
        return normalizedIssueRegion === normalizedName || normalizedIssueRegion.includes(normalizedName) || normalizedName.includes(normalizedIssueRegion);
      })
    )
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: "This issue is outside your assigned region" };
}
