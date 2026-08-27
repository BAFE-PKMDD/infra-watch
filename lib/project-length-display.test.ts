import assert from "node:assert/strict";
import test from "node:test";

import { getProjectLengthDisplay } from "./project-length-display";

test("shows unavailable instead of NaN km when source length is missing", () => {
  assert.deepEqual(
    getProjectLengthDisplay({ projectLength: "Unavailable" }),
    { source: "target", value: "Unavailable" },
  );
});

test("uses a finite post-geotagged distance when available", () => {
  assert.deepEqual(
    getProjectLengthDisplay({ projectLength: "12 km", postGeotaggedLength: "4.567" }),
    { source: "post-geotagged", value: "4.57 km" },
  );
});

test("falls back to the source target length when post-geotagged data is malformed", () => {
  assert.deepEqual(
    getProjectLengthDisplay({ projectLength: "3 units", postGeotaggedLength: "not-a-number" }),
    { source: "target", value: "3 units" },
  );
});

test("formats a bare finite target length as kilometers", () => {
  assert.deepEqual(
    getProjectLengthDisplay({ projectLength: "2.5" }),
    { source: "target", value: "2.50 km" },
  );
});

test("rejects non-finite and blank length values", () => {
  assert.equal(getProjectLengthDisplay({ projectLength: "Infinity" }).value, "Unavailable");
  assert.equal(getProjectLengthDisplay({ projectLength: "" }).value, "Unavailable");
});
