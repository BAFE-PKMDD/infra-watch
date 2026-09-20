import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SMS_GUIDANCE_COPY, SmsGrievanceGuide } from "./sms-grievance-guide";

test("SMS grievance guidance renders honest prototype and phone placeholders", () => {
  const html = renderToStaticMarkup(<SmsGrievanceGuide initialLanguage="en" />);

  assert.match(html, /UI prototype/);
  assert.match(html, /No message will be sent/);
  assert.match(html, /\[OFFICIAL SMS NUMBER\]/);
  assert.match(html, /INFRAWATCH \| ANON or NAME \| PROJECT\/LOCATION \| CONCERN/);
  assert.match(html, /not an emergency service/i);
  assert.doesNotMatch(html, /href="sms:/);
});

test("English and Filipino guidance contain equivalent required sections", () => {
  const keys = ["title", "intro", "anonymous", "identified", "privacy", "emergency", "attachments"] as const;

  for (const key of keys) {
    assert.ok(SMS_GUIDANCE_COPY.en[key]);
    assert.ok(SMS_GUIDANCE_COPY.tl[key]);
  }

  const filipinoHtml = renderToStaticMarkup(<SmsGrievanceGuide initialLanguage="tl" />);
  assert.match(filipinoHtml, /Gabay sa SMS Grievance/);
  assert.match(filipinoHtml, /Hindi serbisyong pang-emergency ang prototype/);
});

test("SMS guidance contains no invented phone number, SLA, or live-service claim", () => {
  const allCopy = JSON.stringify(SMS_GUIDANCE_COPY);

  assert.doesNotMatch(allCopy, /\+63\d{10}/);
  assert.doesNotMatch(allCopy, /within \d+ (hours|days)/i);
  assert.doesNotMatch(allCopy, /available now|live service/i);
});
