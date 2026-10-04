import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";

import { SmsGrievanceTable } from "./sms-grievance-table";

test("SMS grievance table is a scannable list with a prototype notice and a link to each sample's detail page", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />);

  assert.match(html, /SMS Grievance prototype/);
  assert.match(html, /No SMS service is connected/);
  assert.match(html, /Messages to check/);
  assert.match(html, /Message</);
  assert.match(html, /Location</);
  assert.match(html, /Status</);
  assert.match(html, /Received</);

  // A message linked as a duplicate is excluded from every queue view, not just this
  // default one — its content now lives in the case it's linked to. A message already
  // tagged not-a-BAFE-project stays out of this default view too, but is still reachable
  // under its own dedicated "Not a BAFE project" filter.
  for (const item of SMS_MOCK_SCENARIOS) {
    const hasLink = html.includes(`/issues/sms-review/${item.id}`);
    if (item.relevance === "duplicate" || item.relevance === "out_of_scope") {
      assert.ok(!hasLink, `sample ${item.id} (${item.relevance}) should not appear in the default view`);
    } else {
      assert.ok(hasLink, `sample ${item.id} should appear in the default view`);
    }
  }
});

test("the 'Possible copy' filter no longer exists — a linked message has no dedicated tab to audit it from", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />);
  assert.doesNotMatch(html, /Possible copy/);
});

test("queue items show a GCash-style masked mobile number", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />);
  assert.match(html, /09\*{7}89/);
  assert.doesNotMatch(html, /\*\*\* \*\*\* \*\*\*\*/);
});

test("staff can open the simulate-incoming-message control to test the flow with a real number", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />);
  assert.match(html, /Simulate incoming message/);
});

test("a quick 'Not InfraWatch' action is offered only for messages that still need checking", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />);
  const needsCheckingCount = SMS_MOCK_SCENARIOS.filter((item) => item.status === "needs_relevance_review").length;
  const occurrences = html.split("Not InfraWatch").length - 1;
  // Each qualifying message renders the button twice (mobile list + desktop table).
  assert.equal(occurrences, needsCheckingCount * 2);
});
