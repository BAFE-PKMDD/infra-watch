import assert from "node:assert/strict";
import { test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback, issues, notificationRecipients, notifications, projects } from "@/lib/db/schema";
import { deleteSubmissionAndNotifications, pruneOrphanedSubmissionNotifications } from "./submission-notifications";

const databaseTest = process.env.RUN_NOTIFICATION_DB_TESTS === "1" ? test : test.skip;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withRollback(run: (tx: Transaction) => Promise<void>) {
  const rollback = new Error("Rollback notification test fixtures");
  await assert.rejects(db.transaction(async tx => {
    await run(tx);
    throw rollback;
  }), error => error === rollback);
}

async function fixtures(tx: Transaction) {
  const projectId = `notification-test-${crypto.randomUUID()}`;
  await tx.insert(projects).values({ abemisId: projectId, name: "Notification test", status: "ongoing", projectType: "test" });
  const [feedbackRow] = await tx.insert(feedback).values({ projectId, comment: "Notification cleanup test" }).returning();
  const [issueRow] = await tx.insert(issues).values({ ticketNumber: `TEST-${crypto.randomUUID()}`, category: "test", description: "Notification cleanup test" }).returning();
  return { projectId, feedbackRow, issueRow, userId: `test-${crypto.randomUUID()}`, otherUserId: `test-${crypto.randomUUID()}` };
}

async function addNotification(tx: Transaction, metadata: Record<string, unknown>, userIds: string[], type = "comment_posted") {
  const id = crypto.randomUUID();
  await tx.insert(notifications).values({ id, type, title: "Notification test", message: "Temporary test fixture", metadata });
  await tx.insert(notificationRecipients).values(userIds.map(userId => ({ notificationId: id, userId, readAt: new Date() })));
  return id;
}

for (const kind of ["feedback", "issue"] as const) {
  databaseTest(`${kind} deletion atomically removes its notifications for every recipient and preserves unrelated records`, async () => {
    await withRollback(async tx => {
      const data = await fixtures(tx);
      const id = kind === "feedback" ? data.feedbackRow.id : data.issueRow.id;
      const users = [data.userId, data.otherUserId];
      const related = [
        await addNotification(tx, { [kind === "feedback" ? "feedbackId" : "issueId"]: id }, users, `${kind}_submitted`),
        await addNotification(tx, { postId: id, postType: kind }, users),
      ];
      if (kind === "issue") related.push(await addNotification(tx, { ticketNumber: data.issueRow.ticketNumber }, users, "issue_sla_reminder"));
      const unrelated = [
        await addNotification(tx, { projectId: data.projectId }, users, "project_updated"),
        await addNotification(tx, { postId: id, postType: kind === "feedback" ? "issue" : "feedback" }, users),
      ];
      const target = kind === "feedback" ? { kind, id } : { kind, id, ticketNumber: data.issueRow.ticketNumber };

      const forcedFailure = new Error("Force transaction failure");
      await assert.rejects(tx.transaction(async nested => {
        await deleteSubmissionAndNotifications(nested, target);
        throw forcedFailure;
      }), error => error === forcedFailure);
      assert.equal((await tx.select().from(notifications).where(inArray(notifications.id, related))).length, related.length);
      const table = kind === "feedback" ? feedback : issues;
      assert.equal((await tx.select({ id: table.id }).from(table).where(eq(table.id, id))).length, 1);

      const removed = await deleteSubmissionAndNotifications(tx, target);
      assert.equal(removed.length, related.length * users.length);
      assert.equal((await tx.select().from(table).where(eq(table.id, id))).length, 0);
      assert.equal((await tx.select().from(notifications).where(inArray(notifications.id, related))).length, 0);
      assert.equal((await tx.select().from(notificationRecipients).where(inArray(notificationRecipients.notificationId, related))).length, 0);
      assert.equal((await tx.select().from(notifications).where(inArray(notifications.id, unrelated))).length, unrelated.length);
    });
  });
}

databaseTest("old orphaned notifications are removed only from the requesting inbox and all shared recipient copies", async () => {
  await withRollback(async tx => {
    const data = await fixtures(tx);
    const missingId = crypto.randomUUID();
    const orphaned = [
      await addNotification(tx, { feedbackId: missingId }, [data.userId, data.otherUserId]),
      await addNotification(tx, { issueId: missingId }, [data.userId]),
      await addNotification(tx, { postId: missingId, postType: "feedback" }, [data.userId]),
      await addNotification(tx, { postId: missingId, postType: "issue" }, [data.userId]),
      await addNotification(tx, { ticketNumber: "TEST-missing-ticket" }, [data.userId], "issue_submitted"),
    ];
    const kept = [
      await addNotification(tx, { feedbackId: data.feedbackRow.id }, [data.userId]),
      await addNotification(tx, { issueId: data.issueRow.id }, [data.userId]),
      await addNotification(tx, { feedbackId: "", issueId: "" }, [data.userId]),
      await addNotification(tx, {}, [data.userId], "system_notice"),
      await addNotification(tx, { feedbackId: missingId }, [data.otherUserId]),
      await addNotification(tx, { ticketNumber: data.issueRow.ticketNumber }, [data.userId], "issue_sla_reminder"),
    ];
    const removed = await pruneOrphanedSubmissionNotifications(tx, data.userId);
    assert.equal(removed.length, orphaned.length + 1);
    assert.equal((await tx.select().from(notifications).where(inArray(notifications.id, orphaned))).length, 0);
    assert.equal((await tx.select().from(notificationRecipients).where(inArray(notificationRecipients.notificationId, orphaned))).length, 0);
    assert.equal((await tx.select().from(notifications).where(inArray(notifications.id, kept))).length, kept.length);
  });
});
