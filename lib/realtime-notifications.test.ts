import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  broadcastNotificationRemoval,
  publishNotification,
  resetNotificationStoreForTests,
  subscribeToNotifications,
} from "./realtime-notifications";

function controller(events: string[]) {
  return {
    enqueue(chunk: Uint8Array) {
      events.push(new TextDecoder().decode(chunk));
    },
  } as ReadableStreamDefaultController<Uint8Array>;
}

test("realtime notifications are delivered only to explicit recipients", () => {
  resetNotificationStoreForTests();
  const userOneEvents: string[] = [];
  const userTwoEvents: string[] = [];
  const unsubscribeOne = subscribeToNotifications("user-1", controller(userOneEvents));
  const unsubscribeTwo = subscribeToNotifications("user-2", controller(userTwoEvents));

  publishNotification(
    {
      type: "issue_assigned",
      title: "Issue assigned",
      message: "An issue was assigned to you.",
      metadata: { issueId: "issue-1" },
    },
    ["user-1"],
  );

  assert.equal(userOneEvents.filter((event) => event.includes("event: notification")).length, 1);
  assert.equal(userTwoEvents.filter((event) => event.includes("event: notification")).length, 0);
  unsubscribeOne();
  unsubscribeTwo();
});

test("recipient ids are deduplicated and never serialized into the event payload", () => {
  resetNotificationStoreForTests();
  const events: string[] = [];
  const unsubscribe = subscribeToNotifications("user-1", controller(events));

  publishNotification(
    {
      type: "sla_breached",
      title: "SLA breached",
      message: "A response target was missed.",
    },
    ["user-1", "user-1"],
  );

  const notifications = events.filter((event) => event.includes("event: notification"));
  assert.equal(notifications.length, 1);
  assert.doesNotMatch(notifications[0], /recipientUserIds|user-1/);
  unsubscribe();
});

test("notification removal reaches each recipient and only includes their notification ids", () => {
  resetNotificationStoreForTests();
  const first: string[] = [], second: string[] = [], third: string[] = [];
  const unsubscribe = [
    subscribeToNotifications("user-1", controller(first)),
    subscribeToNotifications("user-2", controller(second)),
    subscribeToNotifications("user-3", controller(third)),
  ];
  broadcastNotificationRemoval([
    { userId: "user-1", notificationId: "shared" },
    { userId: "user-1", notificationId: "shared" },
    { userId: "user-2", notificationId: "shared" },
    { userId: "user-2", notificationId: "private-to-user-2" },
  ]);
  const removed = (events: string[]) => events.filter(event => event.includes("event: notifications-removed"));
  assert.equal(removed(first).length, 1);
  assert.match(removed(first)[0], /"ids":\["shared"\]/);
  assert.doesNotMatch(removed(first)[0], /private-to-user-2|user-2/);
  assert.match(removed(second)[0], /private-to-user-2/);
  assert.equal(removed(third).length, 0);
  unsubscribe.forEach(stop => stop());
});
