"use server";

import { and, asc, desc, eq, gte, isNull, lt, lte, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { liveVideos, type LiveVideo } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export async function getAllLiveVideos(): Promise<LiveVideo[]> {
  await requireAdmin();
  const now = new Date();

  await db
    .update(liveVideos)
    .set({ isActive: false, isLive: false })
    .where(and(eq(liveVideos.isActive, true), lt(liveVideos.expiresAt, now)));

  return db
    .select()
    .from(liveVideos)
    .orderBy(asc(liveVideos.displayOrder), desc(liveVideos.createdAt));
}

export async function getActiveLiveVideos() {
  const now = new Date();

  return db
    .select()
    .from(liveVideos)
    .where(
      and(
        eq(liveVideos.isActive, true),
        or(isNull(liveVideos.publishedAt), lte(liveVideos.publishedAt, now)),
        or(isNull(liveVideos.expiresAt), gte(liveVideos.expiresAt, now)),
      ),
    )
    .orderBy(asc(liveVideos.displayOrder), desc(liveVideos.createdAt));
}

export async function getLiveVideoById(id: string): Promise<LiveVideo | null> {
  await requireAdmin();
  const [video] = await db.select().from(liveVideos).where(eq(liveVideos.id, id)).limit(1);
  return video ?? null;
}

export async function getFeaturedVideo(): Promise<LiveVideo | null> {
  const now = new Date();

  const [video] = await db
    .select()
    .from(liveVideos)
    .where(
      and(
        eq(liveVideos.isActive, true),
        eq(liveVideos.isFeatured, true),
        or(isNull(liveVideos.publishedAt), lte(liveVideos.publishedAt, now)),
        or(isNull(liveVideos.expiresAt), gte(liveVideos.expiresAt, now)),
      ),
    )
    .orderBy(asc(liveVideos.displayOrder))
    .limit(1);

  return video ?? null;
}

export async function getCurrentLiveVideo(): Promise<LiveVideo | null> {
  const now = new Date();

  const [video] = await db
    .select()
    .from(liveVideos)
    .where(
      and(
        eq(liveVideos.isActive, true),
        eq(liveVideos.isLive, true),
        or(isNull(liveVideos.publishedAt), lte(liveVideos.publishedAt, now)),
        or(isNull(liveVideos.expiresAt), gte(liveVideos.expiresAt, now)),
      ),
    )
    .limit(1);

  return video ?? null;
}

export async function getLiveVideoStats() {
  await requireAdmin();
  const all = await db.select().from(liveVideos);
  const now = new Date();

  const activeVideos = all.filter((v) => {
    if (!v.isActive) return false;
    if (v.publishedAt && v.publishedAt > now) return false;
    if (v.expiresAt && v.expiresAt < now) return false;
    return true;
  });

  return {
    total: all.length,
    active: activeVideos.length,
    live: all.filter((v) => v.isLive && v.isActive).length,
    featured: all.filter((v) => v.isFeatured && v.isActive).length,
    facebookLive: all.filter((v) => v.videoType === "facebook_live").length,
    youtube: all.filter((v) => v.videoType === "youtube").length,
    recorded: all.filter((v) => v.videoType === "recorded").length,
  };
}
