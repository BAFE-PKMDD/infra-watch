import assert from "node:assert/strict";
import test from "node:test";

import {
  createNotificationsGetHandler,
  createNotificationsPostHandler,
  type NotificationRouteDependencies,
} from "./route";

function dependencies(
  overrides: Partial<NotificationRouteDependencies> = {},
): NotificationRouteDependencies {
  return {
    getSessionUser: async () => null,
    getNotificationsForUser: async () => [],
    markUserNotificationsRead: async () => ({ marked: 0 }),
    ...overrides,
  };
}

test("notification history rejects anonymous callers", async () => {
  const response = await createNotificationsGetHandler(dependencies())(
    new Request("http://localhost/api/notifications"),
  );
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("notification history is loaded only for the authenticated recipient", async () => {
  let requestedUserId: string | null = null;
  const response = await createNotificationsGetHandler(
    dependencies({
      getSessionUser: async () => ({ id: "user-1", role: "moderator" }),
      getNotificationsForUser: async (userId) => {
        requestedUserId = userId;
        return [];
      },
    }),
  )(new Request("http://localhost/api/notifications"));
  assert.equal(response.status, 200);
  assert.equal(requestedUserId, "user-1");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("mark-read rejects anonymous callers and never reaches persistence", async () => {
  let calls = 0;
  const response = await createNotificationsPostHandler(
    dependencies({
      markUserNotificationsRead: async () => {
        calls += 1;
        return { marked: 1 };
      },
    }),
  )(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test("mark-read scopes a notification id to the authenticated recipient", async () => {
  let call: unknown;
  const handler = createNotificationsPostHandler(
    dependencies({
      getSessionUser: async () => ({ id: "user-2" }),
      markUserNotificationsRead: async (userId, options) => {
        call = { userId, options };
        return { marked: 1 };
      },
    }),
  );
  const response = await handler(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "notification-1" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(call, {
    userId: "user-2",
    options: { id: "notification-1", all: false },
  });
});

test("mark-read rejects oversized bodies before persistence", async () => {
  let persistenceCalled = false;
  const handler = createNotificationsPostHandler(
    dependencies({
      getSessionUser: async () => ({ id: "user-2" }),
      markUserNotificationsRead: async () => {
        persistenceCalled = true;
        return { marked: 0 };
      },
    }),
  );
  const response = await handler(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "x".repeat(5000) }),
    }),
  );

  assert.equal(response.status, 413);
  assert.equal(persistenceCalled, false);
});

test("mark-read rejects malformed notification identifiers", async () => {
  let persistenceCalled = false;
  const handler = createNotificationsPostHandler(
    dependencies({
      getSessionUser: async () => ({ id: "user-2" }),
      markUserNotificationsRead: async () => {
        persistenceCalled = true;
        return { marked: 0 };
      },
    }),
  );
  const response = await handler(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "x".repeat(129) }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(persistenceCalled, false);
});

test("mark-read rejects a streamed oversized body without Content-Length", async () => {
  let persistenceCalled = false;
  const encoder = new TextEncoder();
  let chunk = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      chunk += 1;
      if (chunk === 1) {
        controller.enqueue(encoder.encode(`{"id":"${"x".repeat(3000)}`));
      } else if (chunk === 2) {
        controller.enqueue(encoder.encode(`${"x".repeat(3000)}"}`));
      } else {
        throw new Error("The handler read beyond the configured body limit");
      }
    },
  });
  const handler = createNotificationsPostHandler(
    dependencies({
      getSessionUser: async () => ({ id: "user-2" }),
      markUserNotificationsRead: async () => {
        persistenceCalled = true;
        return { marked: 0 };
      },
    }),
  );
  const response = await handler(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" }),
  );

  assert.equal(response.status, 413);
  assert.equal(persistenceCalled, false);
});

test("mark-read rejects a JSON primitive without throwing", async () => {
  const handler = createNotificationsPostHandler(
    dependencies({ getSessionUser: async () => ({ id: "user-2" }) }),
  );
  const response = await handler(
    new Request("http://localhost/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null",
    }),
  );

  assert.equal(response.status, 400);
});
