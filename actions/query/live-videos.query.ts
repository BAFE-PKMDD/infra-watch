"use server";

import { and, asc, desc, eq, gte, isNull, lt, lte, ne, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { liveVideos, type LiveVideo } from "@/lib/db/schema";
import { requireAdminOrRegionalAdmin } from "@/lib/session";
import { assertVideoRequestAccess, canReviewLiveVideos } from "@/lib/live-video-approval";

export async function getAllLiveVideos(): Promise<LiveVideo[]> {
  const user = await requireAdminOrRegionalAdmin();
  const now = new Date();

  await db
    .update(liveVideos)
    .set({ isActive: false, isLive: false })
    .where(and(ne(liveVideos.videoType, "recorded"), eq(liveVideos.isActive, true), lt(liveVideos.expiresAt, now)));

  return db
    .select()
    .from(liveVideos)
    .where(canReviewLiveVideos(user) ? undefined : eq(liveVideos.createdBy, user.id))
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
        eq(liveVideos.approvalStatus, "approved"),
        or(isNull(liveVideos.publishedAt), lte(liveVideos.publishedAt, now)),
        or(eq(liveVideos.videoType, "recorded"), isNull(liveVideos.expiresAt), gte(liveVideos.expiresAt, now)),
      ),
    )
    .orderBy(asc(liveVideos.displayOrder), desc(liveVideos.createdAt));
}

export async function getLiveVideoById(id: string): Promise<LiveVideo | null> {
  const user = await requireAdminOrRegionalAdmin();
  const [video] = await db.select().from(liveVideos).where(eq(liveVideos.id, id)).limit(1);
  if (video) assertVideoRequestAccess(user, video);
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
        eq(liveVideos.approvalStatus, "approved"),
        or(isNull(liveVideos.publishedAt), lte(liveVideos.publishedAt, now)),
        or(eq(liveVideos.videoType, "recorded"), isNull(liveVideos.expiresAt), gte(liveVideos.expiresAt, now)),
      ),
    )
    .orderBy(asc(liveVideos.displayOrder))
    .limit(1);

  return video ?? null;
}

export async function getCurrentLiveVideo(): Promise<LiveVideo | null> {
  const now = new Date();

  try {
    const [video] = await db
      .select()
      .from(liveVideos)
      .where(
        and(
          eq(liveVideos.isActive, true),
          eq(liveVideos.isLive, true),
          eq(liveVideos.approvalStatus, "approved"),
          ne(liveVideos.videoType, "recorded"),
          or(isNull(liveVideos.publishedAt), lte(liveVideos.publishedAt, now)),
          or(isNull(liveVideos.expiresAt), gte(liveVideos.expiresAt, now)),
        ),
      )
      .limit(1);

    return video ?? null;
  } catch (error) {
    console.error("Failed to fetch current live video", error);
    return null;
  }
}

export async function getLiveVideoStats() {
  const user = await requireAdminOrRegionalAdmin();
  const all = await db.select().from(liveVideos).where(canReviewLiveVideos(user) ? undefined : eq(liveVideos.createdBy, user.id));
  const now = new Date();

  const activeVideos = all.filter((v) => {
    if (!v.isActive || v.approvalStatus !== "approved") return false;
    if (v.publishedAt && v.publishedAt > now) return false;
    if (v.videoType !== "recorded" && v.expiresAt && v.expiresAt < now) return false;
    return true;
  });

  return {
    total: all.length,
    active: activeVideos.length,
    live: activeVideos.filter((v) => v.isLive && v.videoType !== "recorded").length,
    featured: activeVideos.filter((v) => v.isFeatured).length,
    facebookLive: all.filter((v) => v.videoType === "facebook_live").length,
    youtube: all.filter((v) => v.videoType === "youtube").length,
    recorded: all.filter((v) => v.videoType === "recorded").length,
  };
}
