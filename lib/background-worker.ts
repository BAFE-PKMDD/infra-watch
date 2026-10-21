import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { user } from "@/auth-schema";
import { db } from "@/lib/db";
import { feedbackComments, syncLogs } from "@/lib/db/schema";
import {
  claimJob,
  failJob,
  finishJob,
  heartbeatJob,
  type BackgroundJob,
} from "@/lib/background-jobs";
import { getNotificationPreferences } from "@/lib/account-preferences";
import { clearPublicCache } from "@/lib/cache";

let running = false;
let lastUploadCleanup = 0;
async function executeJob(
  job: BackgroundJob,
  progress: (processed: number, total: number, message: string) => void,
): Promise<Record<string, unknown>> {
  if (job.kind === "abemis-sync" || job.kind === "location-sync") {
    const resource = job.kind === "abemis-sync" ? "project" : "location";
    const actor = `job:${job.id}`;
    await db
      .update(syncLogs)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorDetails: "Worker restarted; this run will be retried",
      })
      .where(
        and(
          eq(syncLogs.triggeredBy, actor),
          eq(syncLogs.status, "running"),
          eq(syncLogs.resource, resource),
        ),
      );
    if (job.kind === "abemis-sync") {
      const { syncAbemisProjects } = await import("@/lib/abemis/sync");
      const result = await syncAbemisProjects(
        {
          syncType:
            job.payload.syncType === "scheduled" ? "scheduled" : "manual",
          triggeredBy: actor,
        },
        progress,
      );
      if (!result.success || result.status === "skipped")
        throw new Error("Project synchronization did not complete");
      await clearPublicCache();
      return result;
    }
    const { syncPsgcLocations } = await import("@/lib/locations/sync");
    const result = await syncPsgcLocations({
      triggeredBy: actor,
      onProgress: progress,
    });
    if (!result.success)
      throw new Error("Location synchronization did not complete");
    return { ...result };
  }
  if (job.kind === "media-moderation") {
    const { commentId, revision } = z
      .object({ commentId: z.uuid(), revision: z.number().int().min(1) })
      .parse(job.payload);
    const [comment] = await db
      .select()
      .from(feedbackComments)
      .where(
        and(
          eq(feedbackComments.id, commentId),
          eq(feedbackComments.revision, revision),
          eq(feedbackComments.status, "pending"),
        ),
      )
      .limit(1);
    if (!comment) return { obsolete: true };
    const { moderateStoredVideo } = await import("@/lib/video-moderation");
    const { assertSafeImageUpload } =
      await import("@/lib/services/content-moderation");
    const { downloadFile } = await import("@/lib/minio");
    let reason: string | null = null;
    const media = comment.media ?? [];
    for (let index = 0; index < media.length; index++) {
      const item = media[index];
      if (item.type === "video") {
        const result = await moderateStoredVideo(item.url);
        if (result.isNSFW) reason = result.reason;
      } else {
        try {
          await assertSafeImageUpload(await downloadFile(item.url));
        } catch {
          reason = "Image requires staff review";
        }
      }
      progress(index + 1, media.length, "Reviewing attached media");
      if (reason) break;
    }
    const changed = await db
      .update(feedbackComments)
      .set({
        status: reason ? "rejected" : "published",
        autoRejected: Boolean(reason),
        rejectionReason: reason,
        moderatedBy: "system-media-review",
        moderatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(feedbackComments.id, commentId),
          eq(feedbackComments.revision, revision),
          eq(feedbackComments.status, "pending"),
        ),
      )
      .returning();
    if (changed.length && !reason) {
      const { notifyPostSubscribers } = await import("@/lib/post-interactions");
      const [author] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, comment.userId))
        .limit(1);
      await notifyPostSubscribers({
        postId: comment.feedbackId,
        postType: "feedback",
        commenterId: comment.userId,
        commenterName: author?.name ?? "Citizen",
        commentText: comment.comment,
      });
    }
    return { status: reason ? "rejected" : "published" };
  }
  if (job.kind === "notification-delivery") {
    const payload = z
      .object({
        notification: z.object({
          title: z.string().max(500),
          message: z.string().max(10000),
        }),
        emailRecipients: z.array(z.string()).max(1000),
        smsRecipients: z.array(z.string()).max(1000),
      })
      .parse(job.payload);
    const ids = [
      ...new Set([...payload.emailRecipients, ...payload.smsRecipients]),
    ];
    if (!ids.length) return { delivered: 0 };
    const recipients = await db
      .select({ id: user.id, email: user.email, phoneNumber: user.phoneNumber })
      .from(user)
      .where(inArray(user.id, ids));
    const { sendEmail } = await import("@/lib/email");
    const { sendSMS } = await import("@/lib/sms");
    // Progress is a durable per-recipient checkpoint so a retry does not resend successful deliveries.
    const done = new Set(
      z.array(z.string()).catch([]).parse(job.payload.delivered),
    );
    for (const recipient of recipients) {
      const preference = await getNotificationPreferences(recipient.id);
      for (const channel of ["email", "sms"] as const) {
        const checkpoint = `${recipient.id}:${channel}`;
        if (
          done.has(checkpoint) ||
          !preference[channel] ||
          !(
            channel === "email"
              ? payload.emailRecipients
              : payload.smsRecipients
          ).includes(recipient.id)
        )
          continue;
        const result =
          channel === "email"
            ? await sendEmail({
                to: recipient.email,
                subject: payload.notification.title,
                text: payload.notification.message,
              })
            : recipient.phoneNumber
              ? await sendSMS(
                  recipient.phoneNumber,
                  `${payload.notification.title}: ${payload.notification.message}`.slice(
                    0,
                    150,
                  ),
                )
              : { success: true };
        if (!result.success) throw new Error("Notification delivery failed");
        done.add(checkpoint);
        const { backgroundJobs } = await import("@/lib/db/schema");
        await db
          .update(backgroundJobs)
          .set({ payload: { ...job.payload, delivered: [...done] } })
          .where(
            and(
              eq(backgroundJobs.id, job.id),
              eq(backgroundJobs.leaseToken, job.leaseToken!),
            ),
          );
      }
    }
    return { delivered: done.size };
  }
  throw new Error("Unsupported background job");
}

export async function runNextBackgroundJob() {
  if (running) return;
  running = true;
  try {
    if (Date.now() - lastUploadCleanup > 60_000) {
      lastUploadCleanup = Date.now();
      const { cleanExpiredUploads } = await import("@/lib/direct-video-upload");
      await cleanExpiredUploads().catch(() =>
        console.error("Expired upload cleanup will retry"),
      );
    }
    const job = await claimJob();
    if (!job) return;
    let leaseLost = false;
    const heartbeat = setInterval(() => {
      void heartbeatJob(job, job.progress).catch(() => {
        leaseLost = true;
      });
    }, 20_000);
    try {
      const result = await executeJob(job, (processed, total, message) => {
        if (leaseLost) throw new Error("Worker lease was lost");
        job.progress = { processed, total, message };
      });
      if (!leaseLost) await finishJob(job, result);
    } catch (error) {
      console.error("Background job failed", {
        kind: job.kind,
        jobId: job.id,
        error: error instanceof Error ? error.name : "UnknownError",
      });
      if (!leaseLost) await failJob(job);
    } finally {
      clearInterval(heartbeat);
    }
  } finally {
    running = false;
  }
}

export function startBackgroundWorker() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.ENABLE_BACKGROUND_WORKER === "false"
  )
    return;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_BACKGROUND_WORKER !== "true"
  )
    return;
  const holder = globalThis as typeof globalThis & {
    __infraBackgroundWorker?: ReturnType<typeof setInterval>;
  };
  if (holder.__infraBackgroundWorker) return;
  holder.__infraBackgroundWorker = setInterval(() => {
    void runNextBackgroundJob().catch(() =>
      console.error("Background worker cannot reach its job store"),
    );
  }, 3000);
  holder.__infraBackgroundWorker.unref?.();
}
