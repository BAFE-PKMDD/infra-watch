import assert from "node:assert/strict";
import { test } from "bun:test";
import { NextRequest } from "next/server";
import { createSubmissionSurveyStatusHandler } from "./route";

function makeRequest() {
  return new NextRequest("http://localhost:3001/api/submission-survey/status");
}

test("submission-survey status: an anonymous (no session) request has not responded", async () => {
  const handler = createSubmissionSurveyStatusHandler({
    getSession: async () => null,
    hasResponded: async () => {
      throw new Error("should not be called without a session");
    },
  });
  const res = await handler(makeRequest());
  const body = await res.json();
  assert.equal(body.data.hasResponded, false);
});

test("submission-survey status: reports true when the account already has a survey row", async () => {
  const handler = createSubmissionSurveyStatusHandler({
    getSession: async () => ({ user: { id: "user-1" } }),
    hasResponded: async (userId) => {
      assert.equal(userId, "user-1");
      return true;
    },
  });
  const res = await handler(makeRequest());
  const body = await res.json();
  assert.equal(body.data.hasResponded, true);
});

test("submission-survey status: reports false when the account has no survey row yet", async () => {
  const handler = createSubmissionSurveyStatusHandler({
    getSession: async () => ({ user: { id: "user-2" } }),
    hasResponded: async () => false,
  });
  const res = await handler(makeRequest());
  const body = await res.json();
  assert.equal(body.data.hasResponded, false);
});

test("submission-survey status: fails open (does not block reporting) if the lookup throws", async () => {
  const handler = createSubmissionSurveyStatusHandler({
    getSession: async () => ({ user: { id: "user-3" } }),
    hasResponded: async () => {
      throw new Error("database unavailable");
    },
  });
  const res = await handler(makeRequest());
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.hasResponded, false);
});
