import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

import { formatPublicIssueActivity, type PublicIssueActivityRow } from "./public-issue-activity";

test("public citizen-feed issue items use a complete allowlist without reporter, landmark, or evidence fields", () => {
  const source = {
    id: "11111111-1111-4111-8111-111111111111",
    category: "Construction delay",
    status: "reviewing",
    description: "Publicly moderated description",
    province: "Pampanga",

    resolvedAt: null,
    createdAt: new Date("2026-08-24T00:00:00.000Z"),
    projectName: "Public Project",
    projectAbemisId: "ABEMIS-1",
    reporterName: "Private Reporter",
    reporterContact: "639171234567",
    isAnonymous: false,
    landmark: "Private home landmark",
    evidence: [{ type: "image", url: "https://storage.example/private.jpg", lat: 15.1, lon: 120.6 }],
  } as PublicIssueActivityRow & Record<string, unknown>;

  const item = formatPublicIssueActivity(source);

  assert.deepEqual(item, {
    type: "issue",
    id: source.id,
    issueType: "stopped",
    issueDescription: "Publicly moderated description",
    status: "reviewing",
    province: "Pampanga",
    city: "",
    barangay: "",
    responseCount: 0,
    recentResponses: [],
    images: [],
    createdAt: source.createdAt,
    resolvedAt: null,
    project: { id: "ABEMIS-1", name: "Public Project" },
  });
  assert.doesNotMatch(JSON.stringify(item), /Private Reporter|639171234567|Private home landmark|private\.jpg|"lat"|"lon"/);
});

test("public citizen-feed issue items expose only staff-approved images through the sanitized proxy", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const item = formatPublicIssueActivity({
    id,
    category: "Quality",
    status: "reviewing",
    description: "Publicly moderated description",
    province: "Pampanga",
    resolvedAt: null,
    createdAt: new Date("2026-08-24T00:00:00.000Z"),
    projectName: null,
    projectAbemisId: null,
    evidence: [
      { type: "image", url: "issue-evidence/1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg", lat: 15.1, lon: 120.6 },
      { type: "image", url: "issue-evidence/2-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpg", name: "home.jpg", lat: 15.1, lon: 120.6, publicApprovedAt: "2026-10-06T00:00:00.000Z" },
      { type: "video", url: "issue-evidence/3-cccccccccccccccccccccccccccccccc.mp4", publicApprovedAt: "2026-10-06T00:00:00.000Z" },
    ],
  });

  assert.deepEqual(item.images, [`/api/issues/${id}/public-evidence/1`]);
  assert.doesNotMatch(JSON.stringify(item), /issue-evidence|home\.jpg|"lat"|"lon"/);
});

test("public activity-feed query does not select private issue fields", () => {
  const querySource = readFileSync(
    new URL("../actions/query/activity-feed.query.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    querySource,
    /issues\.(?:reporterName|reporterContact|reporterEmail|isAnonymous|landmark|geoVideoTrack|geoVideoUrl)/,
  );
  assert.match(querySource, /rows\.map\(formatPublicIssueActivity\)/);
  assert.match(querySource, /issues\.publicApprovedAt/);
  assert.match(querySource, /issues\.publicDescription/);
  assert.doesNotMatch(querySource, /description:\s*issues\.description/);
});
