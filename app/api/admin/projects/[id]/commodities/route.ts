import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectCommodityOverrides } from "@/lib/db/schema";
import { commodityOverrideSchema } from "@/lib/operations-models";
import { getProjectScopeConditions } from "@/lib/scope";
import { requirePermission } from "@/lib/permissions";
import {
  apiError,
  jsonBody,
  requireStaffApi,
  assertMutationOrigin,
} from "@/lib/staff-api";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
import { clearPublicCache } from "@/lib/cache";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireStaffApi();
    requirePermission(actor.role, "projects", "update");
    const id = z.uuid().parse((await context.params).id);
    const data = commodityOverrideSchema.parse(await jsonBody(request));
    const saved = await db.transaction(async (tx) => {
      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), ...getProjectScopeConditions(actor)))
        .limit(1)
        .for("update");
      if (!project)
        throw Object.assign(
          new Error("Project was not found in your assigned scope"),
          { status: 404 },
        );
      await tx
        .insert(projectCommodityOverrides)
        .values({
          projectId: project.abemisId,
          ...data,
          sourceCommodities: project.commodities ?? [],
          updatedBy: actor.id,
        })
        .onConflictDoUpdate({
          target: projectCommodityOverrides.projectId,
          set: { ...data, updatedBy: actor.id, updatedAt: new Date() },
        });
      await tx
        .update(projects)
        .set({ commodities: data.commodities })
        .where(eq(projects.id, id));
      return project;
    });
    await logAudit({
      tableName: "project_commodity_overrides",
      recordId: saved.abemisId,
      action: "UPDATE",
      oldValues: { commodities: saved.commodities },
      newValues: data,
      context: getAuditContextFromRequest(request, actor),
    });
    await clearPublicCache();
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireStaffApi();
    assertMutationOrigin(request);
    requirePermission(actor.role, "projects", "update");
    const id = z.uuid().parse((await context.params).id);
    const reset = await db.transaction(async (tx) => {
      const [project] = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), ...getProjectScopeConditions(actor)))
        .limit(1)
        .for("update");
      if (!project)
        throw Object.assign(new Error("Project not found"), { status: 404 });
      const [override] = await tx
        .delete(projectCommodityOverrides)
        .where(eq(projectCommodityOverrides.projectId, project.abemisId))
        .returning();
      if (override)
        await tx
          .update(projects)
          .set({ commodities: override.sourceCommodities })
          .where(eq(projects.id, id));
      return project;
    });
    await logAudit({
      tableName: "project_commodity_overrides",
      recordId: reset.abemisId,
      action: "DELETE",
      notes: "Restored the latest synchronized source commodities",
      context: getAuditContextFromRequest(request, actor),
    });
    await clearPublicCache();
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
