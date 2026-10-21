import {
  listModerationComments,
  moderateComment,
} from "@/lib/comment-moderation";
import { apiError, jsonBody, requireStaffApi } from "@/lib/staff-api";
import { logAudit, getAuditContextFromRequest } from "@/lib/audit";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const actor = await requireStaffApi();
    const params = new URL(request.url).searchParams;
    return Response.json(
      await listModerationComments(actor, {
        search: params.get("search") ?? undefined,
        status: params.get("status") ?? undefined,
        page: Number(params.get("page")) || 1,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireStaffApi();
    const input = z
      .object({
        id: z.uuid(),
        action: z.enum(["publish", "reject"]),
        reason: z.string(),
        revision: z.number(),
      })
      .parse(await jsonBody(request));
    const { saved, existing } = await moderateComment(actor, input.id, input);
    await logAudit({
      tableName: "feedback_comments",
      recordId: input.id,
      action: "UPDATE",
      oldValues: existing,
      newValues: saved,
      context: getAuditContextFromRequest(request, actor),
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
