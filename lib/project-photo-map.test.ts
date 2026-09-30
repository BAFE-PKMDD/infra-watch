import assert from "node:assert/strict";
import { test } from "bun:test";
import { getMappableProjectPhotos, parseProjectCoordinates } from "./project-photo-map";
import { sanitizePublicSourceGeotags } from "./public-source-media";
import type { GeoTag } from "@/types/photo.types";

test("normalizes numeric source GPS and retains original gallery indices", () => {
  const photos = sanitizePublicSourceGeotags([
    { url: "https://storage.bafe.gov.ph/no-gps.jpg" },
    { url: "https://storage.bafe.gov.ph/gps.jpg", latitude: 14.5, longitude: 121 },
    { url: "https://storage.bafe.gov.ph/last.jpg", latitude: "15", longitude: "122" },
  ]) as GeoTag[];
  assert.equal(photos[1].latitude, "14.5");
  const markers = getMappableProjectPhotos(photos);
  assert.deepEqual(markers.map(({ index, position }) => ({ index, position })), [
    { index: 1, position: [14.5, 121] },
    { index: 2, position: [15, 122] },
  ]);
  assert.equal(markers[0].tag, photos[1]);
  assert.equal(photos[markers[0].index + 1], markers[1].tag);
});

test("uses only valid Philippine coordinate pairs", () => {
  assert.deepEqual(parseProjectCoordinates(" 14.5, 121 "), [14.5, 121]);
  for (const value of [undefined, "", ",", "0,0", "14.5,121,3", "14abc,121", "Infinity,121", "90,180"]) {
    assert.equal(parseProjectCoordinates(value), null);
  }
  assert.deepEqual(getMappableProjectPhotos([{ latitude: "14", longitude: "" }]), []);
});
