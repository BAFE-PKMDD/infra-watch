import assert from "node:assert/strict";
import { test } from "bun:test";

import { buildPublicIssueMapEntry, type PublicIssueMapRow } from "./public-issue-map";

const row: PublicIssueMapRow = {
  id: "0b0f6a5c-8d1e-4c0b-9a55-3f2d7c1e9a10",
  ticketNumber: "ER-2026-0001",
  category: "damage",
  status: "reviewing",
  publicDescription: "  Cracked canal lining near the pump house.  ",
  publicApprovedAt: new Date("2026-10-01T00:00:00Z"),
  region: "REGION I",
  province: "La Union",
  municipality: "Bauang",
  barangay: "Paringao",
  latitude: null,
  longitude: null,
  evidence: [
    { type: "video", url: "issue-evidence/1-aaaa.mp4", lat: 16.61234, lon: 120.31234 },
    { type: "image", url: "issue-evidence/2-bbbb.jpg", lat: 16.61234, lon: 120.31266 },
  ],
  createdAt: new Date("2026-09-30T00:00:00Z"),
};

test("publishes an approved report with a sanitized photo proxy URL, exact coordinates and place name", () => {
  const entry = buildPublicIssueMapEntry(row);

  assert.ok(entry);
  assert.equal(entry.issueId, `issue:${row.id}`);
  assert.equal(entry.sourceType, "issue");
  assert.equal(entry.detailUrl, `/report-issue/${row.id}`);
  assert.equal(entry.description, "Cracked canal lining near the pump house.");
  assert.deepEqual(entry.evidence, [
    { type: "image", url: `/api/issues/${row.id}/public-evidence/1`, lat: 16.61234, lon: 120.31266 },
  ]);
  assert.equal(entry.geoVideoTrack, null);
  assert.equal(entry.geoVideoUrl, null);
  assert.deepEqual(entry.location, {
    region: "REGION I",
    province: "La Union",
    municipality: "Bauang",
    barangay: "Paringao",
  });
});

test("never exposes storage paths or videos", () => {
  const serialized = JSON.stringify(buildPublicIssueMapEntry(row));

  assert.doesNotMatch(serialized, /issue-evidence|\.mp4/);
});

test("skips reports without an approved public summary", () => {
  assert.equal(buildPublicIssueMapEntry({ ...row, publicApprovedAt: null }), null);
  assert.equal(buildPublicIssueMapEntry({ ...row, publicDescription: null }), null);
  assert.equal(buildPublicIssueMapEntry({ ...row, publicDescription: "   " }), null);
});

test("falls back to the report coordinates and skips photos with no location", () => {
  const located = buildPublicIssueMapEntry({
    ...row,
    latitude: 14.55678,
    longitude: 121.01234,
    evidence: [{ type: "image", url: "issue-evidence/3-cccc.png" }],
  });
  assert.deepEqual(located?.evidence.map(({ lat, lon }) => [lat, lon]), [[14.55678, 121.01234]]);

  assert.equal(
    buildPublicIssueMapEntry({ ...row, evidence: [{ type: "image", url: "issue-evidence/3-cccc.png" }] }),
    null,
  );
  assert.equal(buildPublicIssueMapEntry({ ...row, evidence: null }), null);
});
