import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, count, eq, ilike, or, sum, desc } from "drizzle-orm";

function projectOverviewUrl(...identifiers: Array<string | null>) {
  const identifier = identifiers.find((value): value is string => Boolean(value));
  return identifier ? `/projects/${encodeURIComponent(identifier)}` : null;
}

// ---------------------------------------------------------------------------
// searchProjects — search by keyword, location, status, program, year
// ---------------------------------------------------------------------------

const searchProjectsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Free-text search term to match against project name or contractor name",
    ),
  province: z
    .string()
    .optional()
    .describe("Province name (e.g. Aklan, Leyte, Benguet)"),
  municipality: z.string().optional().describe("Municipality or city name"),
  region: z
    .string()
    .optional()
    .describe(
      "Region name or code (e.g. Region VI, Western Visayas, R6, CAR)",
    ),
  status: z
    .string()
    .optional()
    .describe(
      "Project status filter (e.g. ongoing, completed, not yet started, suspended)",
    ),
  program: z
    .string()
    .optional()
    .describe(
      "Program name (e.g. AMSS, AMEFIP, INS, MIADP, HVCDP, Rice Program)",
    ),
  yearFunded: z
    .string()
    .optional()
    .describe("Year the project was funded (e.g. 2024, 2025)"),
});

export const searchProjects = tool({
  description:
    "Search infrastructure projects by location, status, program, or keyword. Returns up to 10 matching projects with key details.",
  inputSchema: searchProjectsSchema,
  execute: async (params: z.infer<typeof searchProjectsSchema>) => {
    const conditions = [];

    if (params.query) {
      const pattern = `%${params.query}%`;
      conditions.push(
        or(
          ilike(projects.name, pattern),
          ilike(projects.contractorName, pattern),
          ilike(projects.abemisId, pattern),
          ilike(projects.projectCode, pattern),
        ),
      );
    }
    if (params.province) {
      conditions.push(ilike(projects.province, `%${params.province}%`));
    }
    if (params.municipality) {
      conditions.push(
        ilike(projects.municipality, `%${params.municipality}%`),
      );
    }
    if (params.region) {
      conditions.push(ilike(projects.region, `%${params.region}%`));
    }
    if (params.status) {
      conditions.push(ilike(projects.status, `%${params.status}%`));
    }
    if (params.program) {
      conditions.push(ilike(projects.program, `%${params.program}%`));
    }
    if (params.yearFunded) {
      conditions.push(eq(projects.yearFunded, params.yearFunded));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        abemisId: projects.abemisId,
        projectCode: projects.projectCode,
        name: projects.name,
        status: projects.status,
        stage: projects.stage,
        program: projects.program,
        province: projects.province,
        municipality: projects.municipality,
        barangay: projects.barangay,
        region: projects.region,
        budget: projects.budget,
        actualBidAmount: projects.abc,
        physicalProgress: projects.physicalProgress,
        financialProgress: projects.financialProgress,
        contractorName: projects.contractorName,
        yearFunded: projects.yearFunded,
        projectType: projects.projectType,
        startDate: projects.startDate,
        targetCompletionDate: projects.targetCompletionDate,
      })
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.lastSyncedAt))
      .limit(10);

    return {
      resultCount: rows.length,
      projects: rows.map((row) => ({
        id: row.abemisId,
        url: projectOverviewUrl(row.abemisId, row.projectCode),
        projectCode: row.projectCode,
        name: row.name,
        status: row.status,
        stage: row.stage,
        program: row.program,
        location: [row.barangay, row.municipality, row.province, row.region]
          .filter(Boolean)
          .join(", "),
        budget: row.budget
          ? `₱${Number(row.budget).toLocaleString()}`
          : "N/A",
        actualBidAmount: row.actualBidAmount
          ? `₱${Number(row.actualBidAmount).toLocaleString()}`
          : "N/A",
        physicalProgress: `${row.physicalProgress}%`,
        financialProgress: `${row.financialProgress}%`,
        contractor: row.contractorName ?? "N/A",
        yearFunded: row.yearFunded ?? "N/A",
        projectType: row.projectType,
        startDate: row.startDate?.toLocaleDateString() ?? "N/A",
        targetCompletion:
          row.targetCompletionDate?.toLocaleDateString() ?? "N/A",
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// getProjectStats — aggregate counts, budget, status breakdown
// ---------------------------------------------------------------------------

const getProjectStatsSchema = z.object({
  region: z.string().optional().describe("Filter stats by region"),
  province: z.string().optional().describe("Filter stats by province"),
  status: z.string().optional().describe("Filter stats by status"),
  program: z.string().optional().describe("Filter stats by program"),
});

export const getProjectStats = tool({
  description:
    "Get aggregate statistics: total count of projects, total budget, and breakdown by status. Optionally filtered by region, province, or status.",
  inputSchema: getProjectStatsSchema,
  execute: async (params: z.infer<typeof getProjectStatsSchema>) => {
    const conditions = [];

    if (params.region) {
      conditions.push(ilike(projects.region, `%${params.region}%`));
    }
    if (params.province) {
      conditions.push(ilike(projects.province, `%${params.province}%`));
    }
    if (params.status) {
      conditions.push(ilike(projects.status, `%${params.status}%`));
    }
    if (params.program) {
      conditions.push(ilike(projects.program, `%${params.program}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db
      .select({
        totalProjects: count(),
        totalBudget: sum(projects.budget),
      })
      .from(projects)
      .where(whereClause);

    const statusBreakdown = await db
      .select({
        status: projects.status,
        count: count(),
      })
      .from(projects)
      .where(whereClause)
      .groupBy(projects.status)
      .orderBy(desc(count()));

    return {
      totalProjects: totals.totalProjects,
      totalBudget: totals.totalBudget
        ? `₱${Number(totals.totalBudget).toLocaleString()}`
        : "₱0",
      statusBreakdown: statusBreakdown.map((row) => ({
        status: row.status,
        count: row.count,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// getProjectById — full details for a single project
// ---------------------------------------------------------------------------

const getProjectByIdSchema = z.object({
  id: z.string().describe("The project ABEMIS ID, project code, or UUID"),
});

export const getProjectById = tool({
  description:
    "Get full details of a specific project by its ABEMIS ID, project code, or UUID.",
  inputSchema: getProjectByIdSchema,
  execute: async ({ id }: z.infer<typeof getProjectByIdSchema>) => {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      );

    const condition = isUuid
      ? or(
          eq(projects.abemisId, id),
          eq(projects.projectCode, id),
          eq(projects.id, id),
        )
      : or(eq(projects.abemisId, id), eq(projects.projectCode, id));

    const [row] = await db.select().from(projects).where(condition).limit(1);

    if (!row) {
      return { found: false, message: `No project found with ID "${id}".` };
    }

    return {
      found: true,
      project: {
        id: row.abemisId,
        url: projectOverviewUrl(row.abemisId, row.projectCode, row.id),
        projectCode: row.projectCode,
        name: row.name,
        description: row.description ?? "No description provided.",
        status: row.status,
        stage: row.stage,
        program: row.program,
        projectType: row.projectType,
        location: [row.barangay, row.municipality, row.province, row.region]
          .filter(Boolean)
          .join(", "),
        province: row.province,
        municipality: row.municipality,
        barangay: row.barangay,
        region: row.region,
        budget: row.budget
          ? `₱${Number(row.budget).toLocaleString()}`
          : "N/A",
        actualBidAmount: row.abc
          ? `₱${Number(row.abc).toLocaleString()}`
          : "N/A",
        physicalProgress: `${row.physicalProgress}%`,
        financialProgress: `${row.financialProgress}%`,
        contractor: row.contractorName ?? "N/A",
        implementingAgency: row.implementingAgency ?? "N/A",
        yearFunded: row.yearFunded ?? "N/A",
        calendarDays: row.calendarDays ?? "N/A",
        startDate: row.startDate?.toLocaleDateString() ?? "N/A",
        targetCompletion:
          row.targetCompletionDate?.toLocaleDateString() ?? "N/A",
        actualCompletion:
          row.actualCompletionDate?.toLocaleDateString() ?? "N/A",
        bannerProgram: row.bannerProgram ?? "N/A",
        operatingUnit: row.operatingUnit ?? "N/A",
      },
    };
  },
});

// ---------------------------------------------------------------------------
// All tools bundled for the chat route
// ---------------------------------------------------------------------------

export const chatTools = {
  searchProjects,
  getProjectStats,
  getProjectById,
};
