import assert from "node:assert/strict";
import test from "node:test";

import { fetchSubmissionSurveyStatus } from "./use-submission-survey-gate";

async function withMockedFetch<T>(response: Response, run: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => response) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("reports hasResponded true when the status endpoint says so", async () => {
  const result = await withMockedFetch(
    new Response(JSON.stringify({ success: true, data: { hasResponded: true } }), { status: 200 }),
    fetchSubmissionSurveyStatus,
  );
  assert.equal(result.hasResponded, true);
});

test("reports hasResponded false for a first-time account", async () => {
  const result = await withMockedFetch(
    new Response(JSON.stringify({ success: true, data: { hasResponded: false } }), { status: 200 }),
    fetchSubmissionSurveyStatus,
  );
  assert.equal(result.hasResponded, false);
});

test("fails open (treats as already responded) on a non-OK response", async () => {
  const result = await withMockedFetch(new Response("error", { status: 500 }), fetchSubmissionSurveyStatus);
  assert.equal(result.hasResponded, true);
});

test("fails open on an unparseable body", async () => {
  const result = await withMockedFetch(new Response("not json", { status: 200 }), fetchSubmissionSurveyStatus);
  assert.equal(result.hasResponded, true);
});
