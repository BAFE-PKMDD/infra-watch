import {
  apiError,
  requireStaffApi,
  assertMutationOrigin,
} from "@/lib/staff-api";
import { getServiceHealth } from "@/lib/service-health";
import { clearPublicCache } from "@/lib/cache";
import { logAudit, getAuditContextFromRequest } from "@/lib/audit";

export async function GET() {
  try {
    await requireStaffApi(true);
    return Response.json(await getServiceHealth(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await requireStaffApi(true);
    assertMutationOrigin(request);
    const result = await clearPublicCache();
    await logAudit({
      tableName: "public_cache",
      recordId: "cache",
      action: "DELETE",
      notes: "Cleared this InfraWatch instance's public-data cache",
      context: getAuditContextFromRequest(request, actor),
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
