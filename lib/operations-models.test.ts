import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  notificationPreferencesSchema,
  regionalStatisticSchema,
  commodityOverrideSchema,
  directUploadSchema,
  validateUploadParts,
  UPLOAD_PART_SIZE,
  retryDelay,
  videoSampleTimes,
} from "./operations-models";
import { escapeExportCell } from "./project-export";
import { timedHealth } from "./service-health";

test("regional figures preserve unknowns and observed zero, require sources, and reject inconsistent counts", () => {
  const data = {
    year: 2026,
    region: "Bicol Region (Region V)",
    program: "INS",
    fundedProjects: 10,
    completedProjects: 0,
    ongoingProjects: null,
    notYetStartedProjects: null,
    suspendedProjects: null,
    allocatedAmount: 0,
    lengthCompleted: null,
    sourceName: "Regional office",
    sourceUrl: "https://example.invalid/report",
    asOf: "2026-10-17",
    isPublished: false,
  };
  assert.equal(regionalStatisticSchema.parse(data).completedProjects, 0);
  assert.equal(regionalStatisticSchema.parse(data).ongoingProjects, null);
  for (const invalid of [
    { ...data, completedProjects: 11 },
    { ...data, allocatedAmount: NaN },
    { ...data, sourceUrl: "javascript:alert(1)" },
    { ...data, sourceName: "" },
    { ...data, asOf: "2026-02-30" },
    { ...data, region: "Unverified region" },
  ])
    assert.equal(regionalStatisticSchema.safeParse(invalid).success, false);
});
test("account preferences reject account spoofing and commodity edits require an attributable reason", () => {
  assert.equal(
    notificationPreferencesSchema.safeParse({
      inApp: true,
      email: false,
      sms: false,
      userId: "other-account",
    }).success,
    false,
  );
  assert.deepEqual(
    commodityOverrideSchema.parse({
      commodities: [" Rice ", "Rice"],
      reason: "Verified by the regional office",
    }).commodities,
    ["Rice"],
  );
  assert.equal(
    commodityOverrideSchema.safeParse({ commodities: ["Rice"], reason: "" })
      .success,
    false,
  );
});
test("direct upload declarations and multipart manifests cannot exceed limits or omit parts", () => {
  assert.equal(
    directUploadSchema.safeParse({
      name: "video.mp4",
      type: "video/mp4",
      size: 20 * 1024 ** 3,
    }).success,
    true,
  );
  assert.equal(
    directUploadSchema.safeParse({
      name: "video.mp4",
      type: "video/mp4",
      size: 20 * 1024 ** 3 + 1,
    }).success,
    false,
  );
  assert.equal(
    directUploadSchema.safeParse({
      name: "page.html",
      type: "text/html",
      size: 100,
    }).success,
    false,
  );
  const etag = "a".repeat(32);
  validateUploadParts(UPLOAD_PART_SIZE + 1, [
    { partNumber: 1, etag },
    { partNumber: 2, etag },
  ]);
  assert.throws(() =>
    validateUploadParts(UPLOAD_PART_SIZE + 1, [{ partNumber: 2, etag }]),
  );
  assert.throws(() =>
    validateUploadParts(UPLOAD_PART_SIZE + 1, [
      { partNumber: 1, etag },
      { partNumber: 1, etag },
    ]),
  );
  assert.throws(() =>
    validateUploadParts(UPLOAD_PART_SIZE + 1, [
      { partNumber: 1, etag: "invalid" },
      { partNumber: 2, etag },
    ]),
  );
});
test("video moderation samples across the entire recording and cannot accept unknown duration", () => {
  assert.deepEqual(videoSampleTimes(80), [5, 15, 25, 35, 45, 55, 65, 75]);
  for (const value of [0, -1, NaN, Infinity, 86401])
    assert.throws(() => videoSampleTimes(value));
  assert.equal(retryDelay(1), 60000);
  assert.equal(retryDelay(10), 900000);
});
test("project exports neutralize spreadsheet formulas and quote embedded commas and quotes", () => {
  assert.equal(escapeExportCell("=SUM(A1:A2)"), '"\'=SUM(A1:A2)"');
  assert.equal(
    escapeExportCell('Project "A", Phase 2'),
    '"Project ""A"", Phase 2"',
  );
  assert.equal(escapeExportCell(" @command"), '"\' @command"');
});
test("health checks settle within their deadline and never disclose service errors", async () => {
  assert.equal((await timedHealth("Test", async () => true)).status, "healthy");
  const result = await timedHealth("Test", async () => {
    throw new Error("secret connection details");
  });
  assert.equal(result.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(result), /secret/);
  assert.equal(
    (await timedHealth("Test", () => new Promise(() => {}), 10)).status,
    "unavailable",
  );
});
