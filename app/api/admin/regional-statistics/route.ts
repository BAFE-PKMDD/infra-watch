import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { regionalStatistics } from "@/lib/db/schema";
import { regionalStatisticSchema } from "@/lib/operations-models";
import { apiError, jsonBody, requireStaffApi } from "@/lib/staff-api";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { clearPublicCache } from "@/lib/cache";

export async function GET(request: Request) {
  try {
    await requireStaffApi(true);
    const year = z.coerce
      .number()
      .int()
      .min(2000)
      .max(2100)
      .parse(
        new URL(request.url).searchParams.get("year") ||
          new Date().getFullYear(),
      );
    return Response.json({
      data: await db
        .select()
        .from(regionalStatistics)
        .where(eq(regionalStatistics.year, year))
        .orderBy(
          asc(regionalStatistics.region),
          asc(regionalStatistics.program),
        ),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const actor = await requireStaffApi(true);
    const data = regionalStatisticSchema.parse(await jsonBody(request));
    const values = {
      ...data,
      allocatedAmount: data.allocatedAmount?.toString() ?? null,
      lengthCompleted: data.lengthCompleted?.toString() ?? null,
      updatedBy: actor.id,
      updatedAt: new Date(),
    };
    const [old] = await db
      .select()
      .from(regionalStatistics)
      .where(
        and(
          eq(regionalStatistics.year, data.year),
          eq(regionalStatistics.region, data.region),
          eq(regionalStatistics.program, data.program),
        ),
      )
      .limit(1);
    const [saved] = await db
      .insert(regionalStatistics)
      .values(values)
      .onConflictDoUpdate({
        target: [
          regionalStatistics.region,
          regionalStatistics.year,
          regionalStatistics.program,
        ],
        set: values,
      })
      .returning();
    await logAudit({
      tableName: "regional_statistics",
      recordId: saved.id,
      action: old ? "UPDATE" : "CREATE",
      oldValues: old,
      newValues: saved,
      context: getAuditContextFromRequest(request, actor),
    });
    await clearPublicCache();
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await requireStaffApi(true);
    const { id } = z.object({ id: z.uuid() }).parse(await jsonBody(request));
    const [old] = await db
      .delete(regionalStatistics)
      .where(eq(regionalStatistics.id, id))
      .returning();
    if (!old)
      return Response.json({ error: "Record not found" }, { status: 404 });
    await logAudit({
      tableName: "regional_statistics",
      recordId: id,
      action: "DELETE",
      oldValues: old,
      context: getAuditContextFromRequest(request, actor),
    });
    await clearPublicCache();
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
