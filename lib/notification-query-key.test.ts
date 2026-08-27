import assert from "node:assert/strict";
import test from "node:test";

import { notificationQueryKey } from "./notification-query-key";

test("notification cache keys are isolated by authenticated user", () => {
  assert.notDeepEqual(notificationQueryKey("user-1"), notificationQueryKey("user-2"));
  assert.deepEqual(notificationQueryKey("user-1"), ["notifications", "user-1"]);
  assert.deepEqual(notificationQueryKey(null), ["notifications", "anonymous"]);
});
