"use server";

import { and, eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { liveVideos, type LiveVideo } from "@/lib/db/schema";
import { validateLiveVideoActivation, validateLiveVideoSchedule, validateLiveVideoState } from "@/lib/live-video-input";
import { requireAdminOrRegionalAdmin } from "@/lib/session";
import { normalizeExternalVideoUrl } from "@/lib/video-utils";
import { resolveVideoRegion } from "@/lib/live-video-region";
import { assertVideoApproved, assertVideoRequestAccess, assertVideoReviewer, canReviewLiveVideos } from "@/lib/live-video-approval";

type LiveVideoType = "facebook_live" | "youtube" | "recorded";

function normalizeSource(data: {
  videoType: LiveVideoType;
  facebookVideoUrl?: string | null;
  videoPath?: string | null;
}) {
  if (!["facebook_live", "youtube", "recorded"].includes(data.videoType)) {
    throw new Error("Unsupported video type.");
  }

  if (data.videoType === "recorded") {
    if (!data.videoPath) throw new Error("Please upload a recorded video file.");
    return { facebookVideoUrl: null, videoPath: data.videoPath };
  }

  const normalized = normalizeExternalVideoUrl(data.videoType, data.facebookVideoUrl);
  if (!normalized) {
    const provider = data.videoType === "youtube" ? "YouTube" : "Facebook";
    throw new Error(`Please enter a valid HTTPS ${provider} video URL.`);
  }

  return { facebookVideoUrl: normalized, videoPath: null };
}

function revalidateLiveVideoPaths() {
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/live-videos");
}

export async function createLiveVideo(data: {
  title: string;
  region?: string | null;
  description?: string | null;
  videoType: LiveVideoType;
  facebookVideoUrl?: string | null;
  videoPath?: string | null;
  thumbnailPath?: string | null;
  duration?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  isLive?: boolean;
  displayOrder?: number;
  publishedAt?: Date | null;
  expiresAt?: Date | null;
}): Promise<{ success: boolean; data?: LiveVideo; error?: string }> {
  try {
    const user = await requireAdminOrRegionalAdmin();
    const region = resolveVideoRegion(user.region, data.region);
    const reviewer = canReviewLiveVideos(user);
    const source = normalizeSource(data);
    const isActive = reviewer && (data.isActive ?? false);
    const shouldBeLive = reviewer && (data.isLive ?? false);
    validateLiveVideoActivation({ isActive, expiresAt: data.expiresAt ?? null, videoType: data.videoType });
    validateLiveVideoState({ isActive, isLive: shouldBeLive, videoType: data.videoType });
    validateLiveVideoSchedule({
      isLive: shouldBeLive,
      publishedAt: data.publishedAt ?? null,
      expiresAt: data.expiresAt ?? null,
    });

    const video = await db.transaction(async (tx) => {
      if (reviewer && data.isFeatured) {
        await tx
          .update(liveVideos)
          .set({ isFeatured: false, updatedAt: new Date() })
          .where(eq(liveVideos.isFeatured, true));
      }

      const [created] = await tx
        .insert(liveVideos)
        .values({
          title: data.title,
          region,
          approvalStatus: reviewer ? "approved" : "pending",
          reviewedBy: reviewer ? user.id : null,
          reviewedAt: reviewer ? new Date() : null,
          description: data.description,
          videoType: data.videoType,
          facebookVideoUrl: source.facebookVideoUrl,
          videoPath: source.videoPath,
          thumbnailPath: data.thumbnailPath,
          duration: data.duration,
          isActive,
          isFeatured: reviewer && (data.isFeatured ?? false),
          isLive: shouldBeLive,
          displayOrder: data.displayOrder ?? 0,
          publishedAt: data.publishedAt,
          expiresAt: data.videoType === "recorded" ? null : data.expiresAt,
          createdBy: user.id,
        })
        .returning();
      return created;
    });

    revalidateLiveVideoPaths();
    return { success: true, data: video };
  } catch (error) {
    console.error("Failed to create live video:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create live video" };
  }
}

export async function updateLiveVideo(
  id: string,
  data: {
    title?: string;
    region?: string | null;
    description?: string | null;
    videoType?: LiveVideoType;
    facebookVideoUrl?: string | null;
    videoPath?: string | null;
    thumbnailPath?: string | null;
    duration?: number | null;
    isActive?: boolean;
    isFeatured?: boolean;
    isLive?: boolean;
    displayOrder?: number;
    publishedAt?: Date | null;
    expiresAt?: Date | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminOrRegionalAdmin();

    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(liveVideos)
        .where(eq(liveVideos.id, id))
        .limit(1)
        .for("update");
      if (!current) throw new Error("Video not found");

      assertVideoRequestAccess(user, current);
      const reviewer = canReviewLiveVideos(user);
      const region = resolveVideoRegion(user.region, data.region === undefined ? current.region : data.region);
      const nextVideoType = (data.videoType ?? current.videoType) as LiveVideoType;
      const source = normalizeSource({
        videoType: nextVideoType,
        facebookVideoUrl: data.facebookVideoUrl === undefined ? current.facebookVideoUrl : data.facebookVideoUrl,
        videoPath: data.videoPath === undefined ? current.videoPath : data.videoPath,
      });
      const nextIsActive = reviewer && (data.isActive ?? current.isActive);
      const nextIsLive = reviewer && (data.isLive ?? current.isLive);
      const nextIsFeatured = reviewer && (data.isFeatured ?? current.isFeatured);
      if (nextIsActive || nextIsLive || nextIsFeatured) assertVideoApproved(current);
      const nextPublishedAt = data.publishedAt === undefined ? current.publishedAt : data.publishedAt;
      const nextExpiresAt = nextVideoType === "recorded" ? null : data.expiresAt === undefined ? current.expiresAt : data.expiresAt;

      validateLiveVideoActivation({ isActive: nextIsActive, expiresAt: nextExpiresAt, videoType: nextVideoType });
      validateLiveVideoState({
        isActive: nextIsActive,
        isLive: nextIsLive,
        videoType: nextVideoType,
      });
      validateLiveVideoSchedule({
        isLive: nextIsLive,
        publishedAt: nextPublishedAt,
        expiresAt: nextExpiresAt,
      });

      if (nextIsFeatured) {
        await tx
          .update(liveVideos)
          .set({ isFeatured: false, updatedAt: new Date() })
          .where(and(eq(liveVideos.isFeatured, true), not(eq(liveVideos.id, id))));
      }

      await tx
        .update(liveVideos)
        .set({
          title: data.title ?? current.title,
          region,
          approvalStatus: reviewer ? current.approvalStatus : "pending",
          reviewedBy: reviewer ? current.reviewedBy : null,
          reviewedAt: reviewer ? current.reviewedAt : null,
          description: data.description === undefined ? current.description : data.description,
          videoType: nextVideoType,
          facebookVideoUrl: source.facebookVideoUrl,
          videoPath: source.videoPath,
          thumbnailPath: data.thumbnailPath === undefined ? current.thumbnailPath : data.thumbnailPath,
          duration: data.duration === undefined ? current.duration : data.duration,
          isActive: nextIsActive,
          isFeatured: nextIsFeatured,
          isLive: nextIsLive,
          displayOrder: data.displayOrder ?? current.displayOrder,
          publishedAt: nextPublishedAt,
          expiresAt: nextExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(liveVideos.id, id));
    });

    revalidateLiveVideoPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to update live video:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update live video" };
  }
}

export async function deleteLiveVideo(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminOrRegionalAdmin();

    const [video] = await db.select().from(liveVideos).where(eq(liveVideos.id, id)).limit(1);

    if (!video) {
      return { success: false, error: "Video not found" };
    }

    assertVideoRequestAccess(user, video);
    await db.delete(liveVideos).where(eq(liveVideos.id, id));
    revalidateLiveVideoPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete live video:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete live video" };
  }
}

export async function toggleLiveVideoActive(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminOrRegionalAdmin();
    assertVideoReviewer(user);

    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ isActive: liveVideos.isActive, expiresAt: liveVideos.expiresAt, videoType: liveVideos.videoType, approvalStatus: liveVideos.approvalStatus })
        .from(liveVideos)
        .where(eq(liveVideos.id, id))
        .limit(1)
        .for("update");

      if (!current) throw new Error("Video not found");

      const newStatus = !current.isActive;
      if (newStatus) assertVideoApproved(current);
      validateLiveVideoActivation({ isActive: newStatus, expiresAt: current.expiresAt, videoType: current.videoType });
      await tx
        .update(liveVideos)
        .set({
          isActive: newStatus,
          isLive: newStatus && current.videoType !== "recorded" ? undefined : false,
          updatedAt: new Date(),
        })
        .where(eq(liveVideos.id, id));
    });

    revalidateLiveVideoPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle video active status:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle video active status" };
  }
}

export async function toggleLiveVideoLive(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminOrRegionalAdmin();
    assertVideoReviewer(user);

    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          isLive: liveVideos.isLive,
          approvalStatus: liveVideos.approvalStatus,
          isActive: liveVideos.isActive,
          videoType: liveVideos.videoType,
          facebookVideoUrl: liveVideos.facebookVideoUrl,
          videoPath: liveVideos.videoPath,
          publishedAt: liveVideos.publishedAt,
          expiresAt: liveVideos.expiresAt,
        })
        .from(liveVideos)
        .where(eq(liveVideos.id, id))
        .limit(1)
        .for("update");

      if (!current) throw new Error("Video not found");

      const newStatus = !current.isLive;
      if (newStatus) {
        assertVideoApproved(current);
        const videoType = current.videoType as LiveVideoType;
        normalizeSource({
          videoType,
          facebookVideoUrl: current.facebookVideoUrl,
          videoPath: current.videoPath,
        });
        validateLiveVideoState({
          isActive: current.isActive,
          isLive: true,
          videoType,
        });
        validateLiveVideoSchedule({
          isLive: true,
          publishedAt: current.publishedAt,
          expiresAt: current.expiresAt,
        });
      }

      await tx
        .update(liveVideos)
        .set({ isLive: newStatus, updatedAt: new Date() })
        .where(eq(liveVideos.id, id));
    });

    revalidateLiveVideoPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle video live status:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle video live status" };
  }
}

export async function reviewLiveVideo(id: string, decision: "approved" | "rejected"): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdminOrRegionalAdmin();
    assertVideoReviewer(user);
    if (decision !== "approved" && decision !== "rejected") throw new Error("Invalid review decision.");
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(liveVideos).where(eq(liveVideos.id, id)).limit(1).for("update");
      if (!current) throw new Error("Video not found");
      if (current.approvalStatus !== "pending") throw new Error("This request has already been reviewed. Refresh the page.");
      if (decision === "approved") normalizeSource({ videoType: current.videoType as LiveVideoType, facebookVideoUrl: current.facebookVideoUrl, videoPath: current.videoPath });
      await tx.update(liveVideos).set({ approvalStatus: decision, reviewedBy: user.id, reviewedAt: new Date(), isActive: false, isLive: false, isFeatured: false, updatedAt: new Date() }).where(eq(liveVideos.id, id));
    });
    revalidateLiveVideoPaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to review video request" };
  }
}
