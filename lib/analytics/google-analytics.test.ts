import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  buildGtagInitScript,
  gaDisableFlag,
  hasAnalyticsConsent,
  normalizeMeasurementId,
} from "./google-analytics";

test("accepts a GA4 measurement id and trims surrounding whitespace", () => {
  assert.equal(normalizeMeasurementId("G-6J7PQ5KHB1"), "G-6J7PQ5KHB1");
  assert.equal(normalizeMeasurementId("  G-6J7PQ5KHB1\n"), "G-6J7PQ5KHB1");
});

test("rejects missing, empty, and non-GA4 ids so analytics stays off", () => {
  assert.equal(normalizeMeasurementId(undefined), null);
  assert.equal(normalizeMeasurementId(null), null);
  assert.equal(normalizeMeasurementId(""), null);
  assert.equal(normalizeMeasurementId("UA-12345-1"), null);
  assert.equal(normalizeMeasurementId("g-6j7pq5khb1"), null);
  assert.equal(normalizeMeasurementId("G-6J7PQ5KHB1'); alert(1);//"), null);
});

test("analytics consent is true only for an explicit analytics: true choice", () => {
  assert.equal(hasAnalyticsConsent(JSON.stringify({ essential: true, analytics: true })), true);
  assert.equal(hasAnalyticsConsent(JSON.stringify({ essential: true, analytics: false })), false);
  assert.equal(hasAnalyticsConsent(JSON.stringify({ essential: true })), false);
  assert.equal(hasAnalyticsConsent(JSON.stringify({ analytics: "true" })), false);
  assert.equal(hasAnalyticsConsent(null), false);
  assert.equal(hasAnalyticsConsent(undefined), false);
  assert.equal(hasAnalyticsConsent(""), false);
  assert.equal(hasAnalyticsConsent("not json"), false);
  assert.equal(hasAnalyticsConsent("null"), false);
  assert.equal(hasAnalyticsConsent("true"), false);
});

test("builds the property-specific disable flag", () => {
  assert.equal(gaDisableFlag("G-6J7PQ5KHB1"), "ga-disable-G-6J7PQ5KHB1");
});

test("init script configures only the given id with advertising features off", () => {
  const script = buildGtagInitScript("G-6J7PQ5KHB1");
  assert.match(script, /gtag\('config', "G-6J7PQ5KHB1"/);
  assert.match(script, /allow_google_signals: false/);
  assert.match(script, /allow_ad_personalization_signals: false/);
  assert.equal(script.match(/gtag\('config'/g)?.length, 1);
});
