import assert from "node:assert/strict";
import { test } from "bun:test";

import { getLocatedSmsRecords, isValidSmsCoordinates, parseSmsCoordinates } from "./location";
import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";

test("SMS locations retain coordinate order and precision", () => {
  assert.deepEqual(parseSmsCoordinates(" 6.99607, 125.0715867 "), { lat: 6.99607, lng: 125.0715867 });
  assert.deepEqual(parseSmsCoordinates("-33.8688,151.2093"), { lat: -33.8688, lng: 151.2093 });
  assert.deepEqual(parseSmsCoordinates("0,0"), { lat: 0, lng: 0 });
});

test("missing, malformed and out-of-range SMS locations are not plotted", () => {
  for (const value of [undefined, null, 0, {}, "", "null", "Quezon City", "14,", ",121", "14,121,2", "91,121", "14,181", "-91,121", "14,-181", "NaN,121", "Infinity,121"]) {
    assert.equal(parseSmsCoordinates(value), null, `Unexpected point for ${JSON.stringify(value)}`);
  }
  assert.equal(isValidSmsCoordinates({ lat: NaN, lng: 121 }), false);
  assert.equal(isValidSmsCoordinates({ lat: 14, lng: Infinity }), false);
  assert.equal(isValidSmsCoordinates({ lat: "14", lng: "121" }), false);
});

test("map coverage excludes unavailable coordinates and never infers points from message text", () => {
  const template = SMS_MOCK_SCENARIOS[0];
  const records = [
    { ...template, id: "mapped", coordinates: { lat: 14.65, lng: 121.04 } },
    { ...template, id: "text-only", locationLabel: "Coordinates 14.65, 121.04 (no place name provided)" },
    { ...template, id: "invalid", coordinates: { lat: 200, lng: 121 } },
    { ...template, id: "unavailable", coordinates: null },
  ];
  assert.deepEqual(getLocatedSmsRecords(records).map((record) => record.id), ["mapped"]);
  assert.equal(records.length, 4);
  assert.deepEqual(getLocatedSmsRecords([]), []);
});
