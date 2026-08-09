import assert from "node:assert/strict";
import test from "node:test";

import { parseChatHistoryQuery } from "./chat-history-query";

test("bounds chat history analysis pagination", () => {
  assert.deepEqual(parseChatHistoryQuery(new URLSearchParams("page=-2&limit=500")), {
    page: 1,
    limit: 100,
    status: undefined,
    provider: undefined,
  });
});

test("accepts supported chat history analysis filters", () => {
  assert.deepEqual(
    parseChatHistoryQuery(
      new URLSearchParams("page=2&limit=25&status=completed&provider=google"),
    ),
    { page: 2, limit: 25, status: "completed", provider: "google" },
  );
});

test("accepts aborted and timed-out history filters", () => {
  for (const status of ["aborted", "timed_out"]) {
    assert.equal(
      parseChatHistoryQuery(new URLSearchParams(`status=${status}`)).status,
      status,
    );
  }
});
