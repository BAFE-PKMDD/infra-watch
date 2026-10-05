"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { mydasDashboards } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import type { MydasPageData } from "@/types/mydas.types";

const EMPTY_DASHBOARD_PAGES: MydasPageData[] = [{ id: "page-1", elements: [] }];

export async function createMydasDashboard(name: string): Promise<{ id: string; name: string }> {
  const user = await requireAdmin();
  const trimmedName = name.trim().slice(0, 100) || "Untitled Dashboard";
  const [row] = await db
    .insert(mydasDashboards)
    .values({ name: trimmedName, pages: EMPTY_DASHBOARD_PAGES, createdBy: user.id })
    .returning({ id: mydasDashboards.id, name: mydasDashboards.name });
  return row;
}

export async function saveMydasDashboard(id: string, pages: MydasPageData[]): Promise<{ success: boolean }> {
  const user = await requireAdmin();
  const result = await db
    .update(mydasDashboards)
    .set({ pages })
    .where(and(eq(mydasDashboards.id, id), eq(mydasDashboards.createdBy, user.id)))
    .returning({ id: mydasDashboards.id });
  return { success: result.length > 0 };
}

export async function renameMydasDashboard(id: string, name: string): Promise<{ success: boolean }> {
  const user = await requireAdmin();
  const trimmedName = name.trim().slice(0, 100);
  if (!trimmedName) return { success: false };
  const result = await db
    .update(mydasDashboards)
    .set({ name: trimmedName })
    .where(and(eq(mydasDashboards.id, id), eq(mydasDashboards.createdBy, user.id)))
    .returning({ id: mydasDashboards.id });
  return { success: result.length > 0 };
}

export async function deleteMydasDashboard(id: string): Promise<{ success: boolean }> {
  const user = await requireAdmin();
  const result = await db
    .delete(mydasDashboards)
    .where(and(eq(mydasDashboards.id, id), eq(mydasDashboards.createdBy, user.id)))
    .returning({ id: mydasDashboards.id });
  return { success: result.length > 0 };
}
