import assert from "node:assert/strict";
import { spyOn, test } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accountPreferences,
  auditLogs,
  backgroundJobs,
  feedback,
  feedbackComments,
  projectCommodityOverrides,
  projects,
  regionalStatistics,
  uploadSessions,
} from "@/lib/db/schema";
import { user } from "@/auth-schema";
import * as session from "@/lib/session";
import {
  enqueueJob,
  claimJob,
  heartbeatJob,
  finishJob,
} from "./background-jobs";
import { notificationRecipientsForChannel } from "./account-preferences";
import { moderateComment, listModerationComments } from "./comment-moderation";
import {
  PATCH as saveCommodities,
  DELETE as resetCommodities,
} from "@/app/api/admin/projects/[id]/commodities/route";
import { PUT as saveRegional } from "@/app/api/admin/regional-statistics/route";
import { minioClient } from "./minio";
import { Readable } from "node:stream";

const databaseTest =
  process.env.RUN_OPERATIONS_DB_TESTS === "1" ? test : test.skip;
function localDatabaseOnly() {
  assert.ok(
    process.env.DATABASE_URL,
    "Load the local database environment explicitly before running operational fixture tests",
  );
  const hostname = new URL(process.env.DATABASE_URL || "http://localhost")
    .hostname;
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(hostname),
    "Operational fixture tests run only on a local database",
  );
}

databaseTest(
  "direct recordings isolate owners, reject invalid bytes, and use multipart copy for files over 5 GB",
  async () => {
    localDatabaseOnly();
    const { ownedUpload, completeDirectUpload, presignPart } =
      await import("./direct-video-upload");
    const id = crypto.randomUUID();
    const owner = `test-operations-${crypto.randomUUID()}`;
    const size = 6 * 1024 * 1024 * 1024;
    const storagePath = `live-videos/${Date.now()}-${crypto.randomUUID().replaceAll("-", "")}.mp4`;
    const stat = spyOn(minioClient, "statObject").mockResolvedValue({
      size,
      metaData: { "content-type": "video/mp4" },
      etag: "test-source",
      lastModified: new Date(),
    } as Awaited<ReturnType<typeof minioClient.statObject>>);
    const read = spyOn(minioClient, "getPartialObject").mockResolvedValue(
      Readable.from([Buffer.from("not a video")]),
    );
    const copy = spyOn(minioClient, "composeObject").mockResolvedValue({
      etag: "copied",
      versionId: null,
    });
    const remove = spyOn(minioClient, "removeObject").mockResolvedValue(
      undefined,
    );
    try {
      const [upload] = await db
        .insert(uploadSessions)
        .values({
          id,
          userId: owner,
          path: storagePath,
          contentType: "video/mp4",
          size,
          partSize: 50 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 60000),
        })
        .returning();
      await assert.rejects(ownedUpload("another-user", id), /not found/);
      await assert.rejects(presignPart(upload, 0), /Invalid/);
      await assert.rejects(
        completeDirectUpload(upload, []),
        /not a supported video/,
      );
      assert.equal(copy.mock.calls.length, 0);
      assert.equal((await ownedUpload(owner, id)).status, "uploading");
      const bytes = Buffer.alloc(64);
      bytes.write("ftypisom", 4, "ascii");
      read.mockResolvedValue(Readable.from([bytes]));
      assert.equal(
        await completeDirectUpload(await ownedUpload(owner, id), []),
        storagePath,
      );
      assert.equal(copy.mock.calls.length, 1);
      assert.equal(copy.mock.calls[0][0].Object, storagePath);
      assert.equal(
        copy.mock.calls[0][1][0].Object.startsWith("upload-staging/"),
        true,
      );
      assert.equal((await ownedUpload(owner, id)).status, "completed");
      assert.equal(
        await completeDirectUpload(await ownedUpload(owner, id), []),
        storagePath,
      );
      assert.equal(copy.mock.calls.length, 1);
    } finally {
      stat.mockRestore();
      read.mockRestore();
      copy.mockRestore();
      remove.mockRestore();
      await db.delete(uploadSessions).where(eq(uploadSessions.id, id));
    }
  },
);
databaseTest(
  "job deduplication, lease fencing, and terminal settlement persist across worker restarts",
  async () => {
    localDatabaseOnly();
    const actor = `test-operations-${crypto.randomUUID()}`;
    try {
      const [first, second] = await Promise.all([
        enqueueJob("location-sync", actor, {}, actor),
        enqueueJob("location-sync", actor, {}, actor),
      ]);
      assert.equal(first.id, second.id);
      const claimed = await claimJob(first.id);
      assert.ok(claimed);
      assert.equal(await claimJob(first.id), null);
      await heartbeatJob(claimed, {
        processed: 10,
        total: 20,
        message: "Test checkpoint",
      });
      await db
        .update(backgroundJobs)
        .set({ leaseUntil: new Date(0) })
        .where(eq(backgroundJobs.id, first.id));
      const resumed = await claimJob(first.id);
      assert.ok(resumed);
      assert.notEqual(resumed.leaseToken, claimed.leaseToken);
      await assert.rejects(heartbeatJob(claimed, claimed.progress), /lease/);
      await finishJob(resumed, { fixture: true });
      const [saved] = await db
        .select()
        .from(backgroundJobs)
        .where(eq(backgroundJobs.id, first.id));
      assert.equal(saved.status, "completed");
      assert.equal(saved.attempts, 2);
    } finally {
      await db
        .delete(backgroundJobs)
        .where(eq(backgroundJobs.requestedBy, actor));
    }
  },
);

databaseTest(
  "notification channel preferences isolate each account and preserve default in-app delivery",
  async () => {
    localDatabaseOnly();
    const id = `test-operations-${crypto.randomUUID()}`;
    try {
      await db
        .insert(accountPreferences)
        .values({ userId: id, inApp: false, email: true, sms: false });
      assert.deepEqual(
        await notificationRecipientsForChannel(
          [id, "test-unconfigured-account"],
          "inApp",
        ),
        ["test-unconfigured-account"],
      );
      assert.deepEqual(
        await notificationRecipientsForChannel(
          [id, "test-unconfigured-account"],
          "email",
        ),
        [id],
      );
      assert.deepEqual(await notificationRecipientsForChannel([id], "sms"), []);
    } finally {
      await db
        .delete(accountPreferences)
        .where(eq(accountPreferences.userId, id));
    }
  },
);

databaseTest(
  "commodity overrides enforce moderator scope, survive sync, and reset to the newest source values",
  async () => {
    localDatabaseOnly();
    const marker = `test-operations-${crypto.randomUUID()}`;
    const id = crypto.randomUUID();
    const actor = spyOn(session, "getCurrentUser");
    try {
      await db.insert(projects).values({
        id,
        abemisId: marker,
        name: marker,
        status: "ongoing",
        stage: "implementation",
        projectType: "Test",
        yearFunded: "2026",
        program: "INS",
        region: "Bicol Region (Region V)",
        commodities: ["Rice"],
      });
      actor.mockResolvedValue({
        id: marker,
        role: "moderator",
        region: "Other region",
      } as Awaited<ReturnType<typeof session.getCurrentUser>>);
      const request = () =>
        new Request("http://localhost/api/admin/projects/commodities", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commodities: ["Corn"],
            reason: "Verified against a project source",
          }),
        });
      assert.equal(
        (await saveCommodities(request(), { params: Promise.resolve({ id }) }))
          .status,
        404,
      );
      actor.mockResolvedValue({ id: marker, role: "admin" } as Awaited<
        ReturnType<typeof session.getCurrentUser>
      >);
      assert.equal(
        (await saveCommodities(request(), { params: Promise.resolve({ id }) }))
          .status,
        200,
      );
      await (
        await import("./abemis/sync")
      ).upsertProjectValues([
        {
          abemisId: marker,
          name: marker,
          status: "ongoing",
          stage: "implementation",
          projectType: "Test",
          yearFunded: "2026",
          program: "INS",
          region: "Bicol Region (Region V)",
          commodities: ["Vegetables"],
        },
      ]);
      assert.deepEqual(
        (await db.select().from(projects).where(eq(projects.id, id)))[0]
          .commodities,
        ["Corn"],
      );
      assert.deepEqual(
        (
          await db
            .select()
            .from(projectCommodityOverrides)
            .where(eq(projectCommodityOverrides.projectId, marker))
        )[0].sourceCommodities,
        ["Vegetables"],
      );
      assert.equal(
        (
          await resetCommodities(
            new Request("http://localhost/reset", { method: "DELETE" }),
            { params: Promise.resolve({ id }) },
          )
        ).status,
        200,
      );
      assert.deepEqual(
        (await db.select().from(projects).where(eq(projects.id, id)))[0]
          .commodities,
        ["Vegetables"],
      );
    } finally {
      actor.mockRestore();
      await db.delete(projects).where(eq(projects.id, id));
      await db.delete(auditLogs).where(eq(auditLogs.recordId, marker));
    }
  },
);

databaseTest(
  "comment moderation cannot reveal out-of-scope records and rejects stale decisions",
  async () => {
    localDatabaseOnly();
    const marker = `test-operations-${crypto.randomUUID()}`;
    const projectId = crypto.randomUUID();
    const feedbackId = crypto.randomUUID();
    const commentId = crypto.randomUUID();
    try {
      await db.insert(projects).values({
        id: projectId,
        abemisId: marker,
        name: marker,
        status: "ongoing",
        stage: "implementation",
        projectType: "Test",
        yearFunded: "2026",
        program: "INS",
        region: marker,
      });
      await db.insert(feedback).values({
        id: feedbackId,
        projectId: marker,
        comment: marker,
        status: "approved",
        isAnonymous: true,
      });
      await db.insert(feedbackComments).values({
        id: commentId,
        feedbackId,
        userId: marker,
        comment: "A comment for scoped moderation",
        status: "pending",
      });
      const outside = {
        id: marker,
        role: "moderator",
        region: `other-${marker}`,
      };
      assert.equal(
        (await listModerationComments(outside, { search: marker })).data.length,
        0,
      );
      await assert.rejects(
        moderateComment(outside, commentId, {
          action: "publish",
          reason: "Reviewed source",
          revision: 1,
        }),
        /scope/,
      );
      const assigned = { id: marker, role: "moderator", region: marker };
      const changed = await moderateComment(assigned, commentId, {
        action: "publish",
        reason: "Reviewed source",
        revision: 1,
      });
      assert.equal(changed.saved.status, "published");
      await assert.rejects(
        moderateComment(assigned, commentId, {
          action: "reject",
          reason: "Stale decision",
          revision: 1,
        }),
        /changed/,
      );
    } finally {
      await db.delete(projects).where(eq(projects.id, projectId));
    }
  },
);

databaseTest(
  "regional figures remain drafts until explicitly published and never borrow another program's record",
  async () => {
    localDatabaseOnly();
    const marker = `test-operations-${crypto.randomUUID()}`;
    const actor = spyOn(session, "getCurrentUser").mockResolvedValue({
      id: marker,
      role: "admin",
    } as Awaited<ReturnType<typeof session.getCurrentUser>>);
    const region = "Bicol Region (Region V)";
    try {
      assert.equal(
        (
          await db
            .select()
            .from(regionalStatistics)
            .where(
              and(
                eq(regionalStatistics.year, 2099),
                eq(regionalStatistics.region, region),
                eq(regionalStatistics.program, "INS"),
              ),
            )
        ).length,
        0,
        "Reserved fixture slot is already occupied; no record was changed",
      );
      const data = {
        year: 2099,
        region,
        program: "INS",
        fundedProjects: 10,
        completedProjects: 0,
        ongoingProjects: null,
        notYetStartedProjects: null,
        suspendedProjects: null,
        allocatedAmount: 0,
        lengthCompleted: null,
        sourceName: marker,
        sourceUrl: "https://example.invalid/source",
        asOf: "2026-10-17",
        isPublished: false,
      };
      const response = await saveRegional(
        new Request("http://localhost/regional-statistics", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );
      assert.equal(response.status, 200);
      const [saved] = await db
        .select()
        .from(regionalStatistics)
        .where(eq(regionalStatistics.updatedBy, marker));
      assert.equal(saved.isPublished, false);
      assert.equal(saved.completedProjects, 0);
      assert.equal(saved.ongoingProjects, null);
    } finally {
      actor.mockRestore();
      const rows = await db
        .delete(regionalStatistics)
        .where(eq(regionalStatistics.updatedBy, marker))
        .returning();
      if (rows.length)
        await db.delete(auditLogs).where(
          inArray(
            auditLogs.recordId,
            rows.map((row) => row.id),
          ),
        );
      await db.delete(user).where(eq(user.id, marker));
    }
  },
);
