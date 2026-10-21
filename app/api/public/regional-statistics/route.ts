import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { regionalStatistics } from "@/lib/db/schema";
import { cachedPublic } from "@/lib/cache";
import { apiError } from "@/lib/staff-api";

export async function GET(request: Request) {
  try {
    const year = z.coerce
      .number()
      .int()
      .min(2000)
      .max(2100)
      .parse(
        new URL(request.url).searchParams.get("year") ||
          new Date().getFullYear(),
      );
    const rows = await cachedPublic(`regional-statistics:${year}`, 60, () =>
      db
        .select({
          id: regionalStatistics.id,
          year: regionalStatistics.year,
          region: regionalStatistics.region,
          program: regionalStatistics.program,
          fundedProjects: regionalStatistics.fundedProjects,
          completedProjects: regionalStatistics.completedProjects,
          ongoingProjects: regionalStatistics.ongoingProjects,
          notYetStartedProjects: regionalStatistics.notYetStartedProjects,
          suspendedProjects: regionalStatistics.suspendedProjects,
          allocatedAmount: regionalStatistics.allocatedAmount,
          lengthCompleted: regionalStatistics.lengthCompleted,
          sourceName: regionalStatistics.sourceName,
          sourceUrl: regionalStatistics.sourceUrl,
          asOf: regionalStatistics.asOf,
        })
        .from(regionalStatistics)
        .where(
          and(
            eq(regionalStatistics.year, year),
            eq(regionalStatistics.isPublished, true),
          ),
        )
        .orderBy(asc(regionalStatistics.region)),
    );
    return Response.json({ data: rows });
  } catch (error) {
    return apiError(error);
  }
}
