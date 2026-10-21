import { enqueueJob } from "@/lib/background-jobs";
import { apiError, requireStaffApi } from "@/lib/staff-api";
import { getAuditContextFromRequest, logAudit } from "@/lib/audit";
export async function POST(request: Request) {
  try {
    const actor = await requireStaffApi(true);
    const job = await enqueueJob("abemis-sync", actor.id);
    await logAudit({ tableName: "background_jobs", recordId: job.id, action: "CREATE", notes: "Queued ABEMIS project synchronization", context: getAuditContextFromRequest(request, actor) });
    return Response.json({ success: true, jobId: job.id, status: job.status, message: "Synchronization queued. Follow its progress from ABEMIS Sync." }, { status: 202 });
  } catch (error) { return apiError(error); }
}
export async function GET() {
  try { await requireStaffApi(true); return Response.json({ status: "ready" }); }
  catch (error) { return apiError(error); }
}
