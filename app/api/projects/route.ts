import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { projectYearScopeCondition } from "@/lib/abemis/year-scope";

export const runtime = "nodejs";

function tokenize(search: string) {
  // Strips punctuation and the "Brgy./Barangay" label so a pasted "Brgy. X, Y" location
  // still tokenizes cleanly.
  return search
    .split(/[\s,]+/)
    .map((token) => token.replace(/[.,]/g, ""))
    .filter((token) => token.length >= 2 && !/^(brgy|barangay)$/i.test(token));
}

function tokenCondition(token: string) {
  const pattern = `%${token}%`;
  return or(
    ilike(projects.name, pattern),
    ilike(projects.abemisId, pattern),
    ilike(projects.projectCode, pattern),
    ilike(projects.province, pattern),
    ilike(projects.municipality, pattern),
    ilike(projects.barangay, pattern),
  )!;
}

const SELECT_COLUMNS = {
  id: projects.abemisId,
  name: projects.name,
  code: projects.projectCode,
  sourceId: projects.abemisId,
  province: projects.province,
  municipality: projects.municipality,
  barangay: projects.barangay,
  region: projects.region,
  farmOperation: projects.farmOperation,
};

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const type = request.nextUrl.searchParams.get("type")?.trim();
  const nearProvince = request.nextUrl.searchParams.get("province")?.trim();
  const farmOperation = request.nextUrl.searchParams.get("farmOperation")?.trim();
  // A hard, exact narrowing distinct from `province` above (which only biases sort order
  // for the `type` browse mode below) — used by staff-facing search UIs that let someone
  // pick an exact province from a dropdown and expect results actually limited to it.
  const provinceExact = request.nextUrl.searchParams.get("provinceExact")?.trim();
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 10), 25);
  const tokens = search ? tokenize(search) : [];

  // Same standardized project type, when there's no search text at all — biased toward
  // the citizen's province, but not limited to it, so this still returns results. (When
  // `type` is combined with `search`, it narrows the token search instead — see below.)
  if (type && tokens.length === 0) {
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(projects)
      .where(and(projectYearScopeCondition(), eq(projects.projectType, type)))
      .orderBy(
        nearProvince ? sql`case when lower(${projects.province}) = lower(${nearProvince}) then 0 else 1 end` : sql`0`,
        desc(projects.lastSyncedAt),
      )
      .limit(limit);
    return NextResponse.json({ success: true, data: rows.map((row) => ({ ...row, matchType: "type" as const })) });
  }

  // Browse by farm-operation category alone, with no search text — for a report about
  // something that has no obvious project-name keyword to search by (e.g. distributed
  // farm equipment like a hand tractor, which isn't itself a built infrastructure
  // project), staff can narrow by category and province instead of guessing a location.
  if (farmOperation && tokens.length === 0) {
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(projects)
      .where(and(
        projectYearScopeCondition(),
        eq(projects.farmOperation, farmOperation),
        ...(provinceExact ? [eq(projects.province, provinceExact)] : []),
      ))
      .orderBy(desc(projects.lastSyncedAt))
      .limit(limit);
    return NextResponse.json({ success: true, data: rows.map((row) => ({ ...row, matchType: "type" as const })) });
  }

  if (tokens.length === 0) {
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(projects)
      .where(projectYearScopeCondition())
      .orderBy(desc(projects.lastSyncedAt))
      .limit(limit);
    return NextResponse.json({ success: true, data: rows.map((row) => ({ ...row, matchType: "exact" as const })) });
  }

  // Optional hard narrowing on top of the free-text token match, so a search can be
  // combined with "only this project type", "only this farm-operation category", and/or
  // "only this province" instead of scrolling past unrelated results to find a match.
  const narrowingConditions = [
    ...(type ? [eq(projects.projectType, type)] : []),
    ...(farmOperation ? [eq(projects.farmOperation, farmOperation)] : []),
    ...(provinceExact ? [eq(projects.province, provinceExact)] : []),
  ];

  // Every word must match something (AND across words, OR across fields per word), so
  // a query spanning fields — e.g. a barangay plus a municipality — still matches even
  // though no single field contains the whole typed phrase.
  const exactRows = await db
    .select(SELECT_COLUMNS)
    .from(projects)
    .where(and(projectYearScopeCondition(), ...narrowingConditions, ...tokens.map(tokenCondition)))
    .orderBy(desc(projects.lastSyncedAt))
    .limit(limit);

  if (exactRows.length > 0) {
    return NextResponse.json({ success: true, data: exactRows.map((row) => ({ ...row, matchType: "exact" as const })) });
  }

  // Nothing matched every word — e.g. no project has that exact barangay on file. Fall
  // back to matching ANY word (still real field matches, not a random list) so a
  // barangay-level miss still surfaces the nearby projects sharing its municipality or
  // province, tagged so the UI can say plainly that this isn't an exact match.
  const nearbyRows = await db
    .select(SELECT_COLUMNS)
    .from(projects)
    .where(and(projectYearScopeCondition(), ...narrowingConditions, or(...tokens.map(tokenCondition))))
    .orderBy(desc(projects.lastSyncedAt))
    .limit(limit);

  return NextResponse.json({ success: true, data: nearbyRows.map((row) => ({ ...row, matchType: "nearby" as const })) });
}
