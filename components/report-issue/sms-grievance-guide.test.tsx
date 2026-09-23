import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SMS_GUIDANCE_COPY, SmsGrievanceGuide } from "./sms-grievance-guide";

test("SMS grievance guidance renders honest prototype status and the SMS format", () => {
  const html = renderToStaticMarkup(<SmsGrievanceGuide initialLanguage="en" />);

  assert.match(html, /UI prototype/);
  assert.match(html, /No message will be sent/);
  assert.match(html, /0912-345-6789/);
  assert.match(html, /Project Type\nName of Sender \(Optional\)\nAge\nGender\nLocation\n\nConcern/);
  assert.match(html, /not an emergency service/i);
  assert.doesNotMatch(html, /href="sms:/);
  // The automated reply is revealed on a timer client-side, after the sender's message
  // finishes "typing" in the phone preview — it must stay out of the initial server-rendered
  // HTML, or it would flash in immediately (and, while present-but-hidden, its height used to
  // push the typing bubble out of the scrollable preview — see the phone mockup component).
  assert.doesNotMatch(html, /Good day! Thank you for your report/);
});

test("the automated reply template carries a ticket placeholder in both languages", () => {
  assert.match(SMS_GUIDANCE_COPY.en.autoReply, /ticket No\. \{\{TICKET_ID\}\}/);
  assert.match(SMS_GUIDANCE_COPY.tl.autoReply, /Ticket Blg\. \{\{TICKET_ID\}\}/);
});

test("English and Filipino guidance contain equivalent required sections", () => {
  const keys = ["title", "intro", "exampleNote", "trackingNote", "sample", "autoReply", "privacy", "emergency", "attachments"] as const;

  for (const key of keys) {
    assert.ok(SMS_GUIDANCE_COPY.en[key]);
    assert.ok(SMS_GUIDANCE_COPY.tl[key]);
  }

  const filipinoHtml = renderToStaticMarkup(<SmsGrievanceGuide initialLanguage="tl" />);
  assert.match(filipinoHtml, /Gabay sa SMS Grievance/);
  assert.match(filipinoHtml, /Hindi ito serbisyong pang-emergency/);
});

test("SMS guidance contains no invented phone number, SLA, or live-service claim", () => {
  const allCopy = JSON.stringify(SMS_GUIDANCE_COPY);

  assert.doesNotMatch(allCopy, /\+63\d{10}/);
  assert.doesNotMatch(allCopy, /within \d+ (hours|days)/i);
  assert.doesNotMatch(allCopy, /available now|live service/i);
});
