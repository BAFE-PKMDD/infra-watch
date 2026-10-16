import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  announcementInputSchema,
  articleInputSchema,
  getAnnouncementStatus,
  mapLayerInputSchema,
} from "./content-models";
import { getWmsUrl } from "./map-layer-config";

test("article references validate URLs and normalize optional fields and tags", () => {
  const parsed = articleInputSchema.parse({
    title: " Test article ",
    url: "https://example.com/article",
    source: "DA",
    category: "research",
    projectId: "",
    thumbnail: "",
    tags: "research, fisheries",
  });
  assert.equal(parsed.title, "Test article");
  assert.equal(parsed.projectId, null);
  assert.deepEqual(parsed.tags, ["research", "fisheries"]);
  assert.equal(
    articleInputSchema.safeParse({ ...parsed, url: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    articleInputSchema.safeParse({
      ...parsed,
      thumbnail: "data:image/svg+xml,test",
    }).success,
    false,
  );
});

test("announcement scheduling rejects reversed dates and reports exact display states", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  assert.equal(
    announcementInputSchema.safeParse({
      title: "Notice",
      content: "Test",
      startDate: "2026-10-13T00:00:00Z",
      endDate: "2026-10-12T00:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    getAnnouncementStatus(
      { isActive: true, startDate: "2026-10-13T00:00:00Z" },
      now,
    ),
    "Scheduled",
  );
  assert.equal(
    getAnnouncementStatus(
      { isActive: true, endDate: "2026-10-11T00:00:00Z" },
      now,
    ),
    "Expired",
  );
  assert.equal(getAnnouncementStatus({ isActive: false }, now), "Inactive");
  assert.equal(
    getAnnouncementStatus(
      { isActive: true, startDate: now, endDate: now },
      now,
    ),
    "Active",
  );
});

test("map layers validate opacity and legend colors and support WMS endpoints", () => {
  const layer = {
    name: "Layer",
    geoserverUrl: "https://example.com/geoserver/",
    workspace: "geoagri",
    layerName: "roads",
    opacity: 0.7,
  };
  assert.equal(mapLayerInputSchema.safeParse(layer).success, true);
  assert.equal(
    mapLayerInputSchema.safeParse({ ...layer, opacity: 1.1 }).success,
    false,
  );
  assert.equal(
    mapLayerInputSchema.safeParse({ ...layer, legendColor: "red;script" })
      .success,
    false,
  );
  assert.equal(
    getWmsUrl(layer.geoserverUrl, layer.workspace),
    "https://example.com/geoserver/geoagri/wms",
  );
  assert.equal(
    getWmsUrl(
      "https://example.com/geoserver/geoagri/wms?request=GetCapabilities",
      "geoagri",
    ),
    "https://example.com/geoserver/geoagri/wms",
  );
});
