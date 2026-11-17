import assert from "node:assert/strict";
import test from "node:test";

import { buildSyncFailureEmail, getSyncFailureAlertRecipients } from "./sync-failure-alert";

test("recipients are read from a comma-separated setting and blanks are ignored", () => {
  assert.deepEqual(getSyncFailureAlertRecipients("a@example.com, b@example.com ,, not-an-address"), ["a@example.com", "b@example.com"]);
  assert.deepEqual(getSyncFailureAlertRecipients(""), []);
  assert.deepEqual(getSyncFailureAlertRecipients(undefined), []);
});

test("the failure email says how many attempts failed and lists the reasons", () => {
  const email = buildSyncFailureEmail({
    attempts: 3,
    failedAt: new Date("2026-11-17T03:00:00Z"),
    reasons: ["sync: ABEMIS API returned status 526: <none>"],
    siteUrl: "https://example.test/",
  });
  assert.equal(email.subject, "InfraWatch: ABEMIS sync failed 3 times in a row");
  assert.match(email.text, /failed 3 times in a row/);
  assert.match(email.text, /status 526/);
  assert.match(email.text, /https:\/\/example\.test\/sync/);
  assert.match(email.text, /11:00/);
});

test("the failure email still reads well when no reason was recorded", () => {
  const email = buildSyncFailureEmail({ attempts: 3, failedAt: new Date(), reasons: [] });
  assert.match(email.text, /No detail was recorded/);
});
