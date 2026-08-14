import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { syncLogs } from "@/lib/db/schema";

export async function getLastSuccessfulProjectSyncAt(): Promise<Date | null> {
  const [row] = await db
    .select({ completedAt: syncLogs.completedAt })
    .from(syncLogs)
    .where(and(eq(syncLogs.resource, "project"), eq(syncLogs.status, "completed")))
    .orderBy(desc(syncLogs.completedAt))
    .limit(1);

  return row?.completedAt ?? null;
}