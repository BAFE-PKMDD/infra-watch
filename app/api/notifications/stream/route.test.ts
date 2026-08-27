import assert from "node:assert/strict";
import test from "node:test";

import {
  createNotificationStreamGetHandler,
  type NotificationStreamDependencies,
} from "./route";

function dependencies(
  overrides: Partial<NotificationStreamDependencies> = {},
): NotificationStreamDependencies {
  return {
    getSessionUser: async () => null,
    subscribe: () => () => {},
    ...overrides,
  };
}

test("notification SSE rejects anonymous callers before subscribing", async () => {
  let subscribed = false;
  const response = await createNotificationStreamGetHandler(
    dependencies({ subscribe: () => { subscribed = true; return () => {}; } }),
  )(new Request("http://localhost/api/notifications/stream"));
  assert.equal(response.status, 401);
  assert.equal(subscribed, false);
});

test("notification SSE subscribes under the authenticated recipient id", async () => {
  let subscribedUserId: string | null = null;
  const response = await createNotificationStreamGetHandler(
    dependencies({
      getSessionUser: async () => ({ id: "user-1", role: "moderator" }),
      subscribe: (userId) => {
        subscribedUserId = userId;
        return () => {};
      },
    }),
  )(new Request("http://localhost/api/notifications/stream"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream");
  assert.equal(subscribedUserId, "user-1");
  await response.body?.cancel();
});
