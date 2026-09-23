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

  for (const item of SMS_MOCK_SCENARIOS) {
    assert.match(html, new RegExp(`/issues/sms-review/${item.id}`));
  }
});

test("queue items show a GCash-style masked mobile number", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />);
  assert.match(html, /09\*{7}89/);
  assert.doesNotMatch(html, /\*\*\* \*\*\* \*\*\*\*/);
});
