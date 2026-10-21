import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { projectYearScopeCondition } from "@/lib/abemis/year-scope";
import { publicStageCondition } from "@/lib/public-analytics/public-stage-condition";
import { mapPublicToInternalStages } from "@/constants/stage-mapping";
import type { PublicProjectDirectoryState } from "@/lib/public-project-directory";

export function projectExportConditions(filters: PublicProjectDirectoryState) {
  const conditions = [projectYearScopeCondition(), publicStageCondition()];
  if (filters.searchQuery) {
    const query = `%${filters.searchQuery}%`;
    conditions.push(
      or(
        ilike(projects.name, query),
        ilike(projects.abemisId, query),
        ilike(projects.projectCode, query),
        ilike(projects.contractorName, query),
      )!,
    );
  }
  if (filters.program !== "all")
    conditions.push(ilike(projects.program, filters.program));
  const location =
    filters.barangay !== "all"
      ? filters.barangay
      : filters.municipality !== "all"
        ? filters.municipality
        : filters.province !== "all"
          ? filters.province
          : null;
  if (location) conditions.push(ilike(projects.psgcCode, `${location}%`));
  else if (filters.region !== "all")
    conditions.push(
      or(
        ...filters.region
          .split(",")
          .filter(Boolean)
          .map((prefix) => ilike(projects.psgcCode, `${prefix}%`)),
      )!,
    );
  if (filters.status !== "all") {
    const stages = mapPublicToInternalStages(filters.status);
    conditions.push(
      stages.length
        ? inArray(
            sql`lower(${projects.status})`,
            stages.map((value) => value.toLowerCase()),
          )
        : eq(sql`lower(${projects.status})`, filters.status.toLowerCase()),
    );
  }
  if (filters.year !== "all")
    conditions.push(eq(projects.yearFunded, filters.year));
  if (filters.farmOperation !== "all")
    conditions.push(ilike(projects.farmOperation, filters.farmOperation));
  if (filters.projectType !== "all")
    conditions.push(ilike(projects.projectType, filters.projectType));
  return and(...conditions);
}

export async function exportPublicProjects(
  filters: PublicProjectDirectoryState,
) {
  const order =
    filters.sort === "name-asc"
      ? [asc(projects.name), asc(projects.id)]
      : filters.sort === "budget-desc"
        ? [sql`${projects.budget} desc nulls last`, desc(projects.id)]
        : filters.sort === "budget-asc"
          ? [sql`${projects.budget} asc nulls last`, asc(projects.id)]
          : filters.sort === "year-desc"
            ? [desc(projects.yearFunded), desc(projects.id)]
            : [desc(projects.lastSyncedAt), desc(projects.id)];
  const rows = await db
    .select({
      code: projects.abemisId,
      name: projects.name,
      program: projects.program,
      status: projects.status,
      region: projects.region,
      province: projects.province,
      municipality: projects.municipality,
      year: projects.yearFunded,
      approvedBudget: projects.budget,
      physicalProgress: projects.physicalProgress,
      commodities: projects.commodities,
    })
    .from(projects)
    .where(projectExportConditions(filters))
    .orderBy(...order)
    .limit(30001);
  if (rows.length > 30000)
    throw Object.assign(
      new Error(
        "This export exceeds 30,000 projects. Narrow the filters and try again.",
      ),
      { status: 413 },
    );
  return rows;
}
export type ExportProject = Awaited<
  ReturnType<typeof exportPublicProjects>
>[number];
export const PROJECT_EXPORT_COLUMNS = [
  "Code",
  "Project",
  "Program",
  "Status",
  "Region",
  "Province",
  "Municipality",
  "Funding year",
  "Approved budget (PHP)",
  "Physical progress (%)",
  "Commodities",
];
export function projectExportCells(row: ExportProject): string[] {
  return [
    row.code,
    row.name,
    row.program,
    row.status,
    row.region ?? "Unavailable",
    row.province ?? "Unavailable",
    row.municipality ?? "Unavailable",
    row.year ?? "Unavailable",
    row.approvedBudget ?? "Unavailable",
    String(row.physicalProgress),
    row.commodities?.join(", ") || "Unavailable",
  ];
}
export function escapeExportCell(value: string) {
  return `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
}
export function projectExportCsv(rows: ExportProject[]) {
  return (
    "\uFEFF" +
    [PROJECT_EXPORT_COLUMNS, ...rows.map(projectExportCells)]
      .map((row) => row.map(escapeExportCell).join(","))
      .join("\r\n")
  );
}
