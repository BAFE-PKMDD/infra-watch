import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { psgcLocations, syncLogs } from "@/lib/db/schema";
import { apiError, requireStaffApi } from "@/lib/staff-api";

export async function GET() {
  try {
    await requireStaffApi(true);
    const [[total], logs] = await Promise.all([
      db.select({ count: count() }).from(psgcLocations),
      db
        .select()
        .from(syncLogs)
        .where(eq(syncLogs.resource, "location"))
        .orderBy(desc(syncLogs.createdAt))
        .limit(20),
    ]);
    return Response.json(
      { count: total.count, logs },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
