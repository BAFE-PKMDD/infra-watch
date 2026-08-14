import assert from "node:assert/strict";
import test from "node:test";

import { getProjectMarkerColor, toSourceBackedMapPins } from "./public-project-map";

test("map marker colors match the public project status legend", () => {
  assert.equal(getProjectMarkerColor("completed"), "#22c55e");
  assert.equal(getProjectMarkerColor("on going"), "#eab308");
  assert.equal(getProjectMarkerColor("not yet started"), "#ef4444");
  assert.equal(getProjectMarkerColor("unrecognized"), "#64748b");
});

test("maps only records with valid source-backed Philippine coordinates", () => {
  const pins = toSourceBackedMapPins([
    { id: "valid", name: "Valid", latitude: 14.5995, longitude: 120.9842, status: "completed", program: "AMEFIP", barangay: null, municipality: "Manila", physicalProgress: 100 },
    { id: "missing", name: "Missing", latitude: null, longitude: null, status: "ongoing", program: "INS", barangay: "A", municipality: "B", physicalProgress: 20 },
    { id: "outside", name: "Outside", latitude: 35.6762, longitude: 139.6503, status: "ongoing", program: "INS", barangay: "A", municipality: "B", physicalProgress: 20 },
  ]);

  assert.deepEqual(pins, [{
    id: "valid",
    name: "Valid",
    lat: 14.5995,
    lng: 120.9842,
    status: "completed",
    type: "amefip",
    desc: "Manila",
    progress: 100,
  }]);
});
