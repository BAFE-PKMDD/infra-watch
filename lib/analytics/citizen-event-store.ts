import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { analyticsEvents, projects } from "@/lib/db/schema";
import type { NormalizedCitizenEngagementEvent } from "./citizen-event-policy";

export async function isKnownCitizenAnalyticsProject(projectId: string): Promise<boolean> {
  const [row] = await db.select({ id: projects.id })
    .from(projects)
    .where(sql`coalesce(${projects.abemisId}, ${projects.projectCode}, ${projects.id}::text) = ${projectId}`)
    .limit(1);
  return Boolean(row);
}

export async function insertCitizenEngagementEvent(
  event: NormalizedCitizenEngagementEvent & { networkRegionCode?: string },
): Promise<void> {
  await db.insert(analyticsEvents).values(event);
}
