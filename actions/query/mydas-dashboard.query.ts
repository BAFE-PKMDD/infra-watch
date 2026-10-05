"use server";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { mydasDashboards } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import type { MydasDashboardSummary, MydasPageData } from "@/types/mydas.types";

export async function listMydasDashboards(): Promise<MydasDashboardSummary[]> {
  const user = await requireAdmin();
  const rows = await db
    .select({ id: mydasDashboards.id, name: mydasDashboards.name, updatedAt: mydasDashboards.updatedAt })
    .from(mydasDashboards)
    .where(eq(mydasDashboards.createdBy, user.id))
    .orderBy(desc(mydasDashboards.updatedAt));
  return rows;
}

export async function getMydasDashboard(id: string): Promise<{ id: string; name: string; pages: MydasPageData[] } | null> {
  const user = await requireAdmin();
  const [row] = await db
    .select({ id: mydasDashboards.id, name: mydasDashboards.name, pages: mydasDashboards.pages, createdBy: mydasDashboards.createdBy })
    .from(mydasDashboards)
    .where(eq(mydasDashboards.id, id))
    .limit(1);

  if (!row || row.createdBy !== user.id) return null;
  return { id: row.id, name: row.name, pages: row.pages };
}
