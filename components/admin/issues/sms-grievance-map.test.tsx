import assert from "node:assert/strict";
import { test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";
import { SmsGrievanceMap } from "./sms-grievance-map";
import { SmsGrievanceTable } from "./sms-grievance-table";

const mapped = { ...SMS_MOCK_SCENARIOS[0], coordinates: { lat: 6.99607, lng: 125.0715867 } };

test("the SMS queue includes map coverage and keeps unlocated messages reviewable", () => {
  const html = renderToStaticMarkup(<SmsGrievanceTable initialRecords={[mapped, SMS_MOCK_SCENARIOS[1]]} />);
  assert.match(html, /Approximate message locations/);
  assert.match(html, /1 of 2/);
  assert.match(html, /1 without usable coordinates/);
  assert.match(html, /Accuracy is unknown/);
  assert.match(html, /Locate a message/);
  assert.match(html, new RegExp(`/issues/sms-review/${SMS_MOCK_SCENARIOS[1].id}`));
});

test("a queue without coordinates states what is missing without inventing map points", () => {
  const html = renderToStaticMarkup(<SmsGrievanceMap records={SMS_MOCK_SCENARIOS} />);
  assert.match(html, /No coordinates available to map/);
  assert.match(html, /A place name alone is not plotted/);
  assert.doesNotMatch(html, /Locate a message|Show all locations/);
});

test("an empty queue explains how to see other message locations", () => {
  const html = renderToStaticMarkup(<SmsGrievanceMap records={[]} />);
  assert.match(html, /0 of 0/);
  assert.match(html, /Choose another queue/);
});

test("a single review shows approximate coordinates without a redundant review link", () => {
  const html = renderToStaticMarkup(<SmsGrievanceMap records={[mapped]} singleMessage />);
  assert.match(html, /Approximate message location</);
  assert.match(html, /6\.99607, 125\.07159/);
  assert.doesNotMatch(html, /Review message|Locate a message/);
});
