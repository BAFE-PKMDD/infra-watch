import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPublicIssue,
  type PublicIssueRow,
} from "@/lib/public-issue-dto";

const row: PublicIssueRow = {
  id: "11111111-1111-4111-8111-111111111111",
  ticketNumber: "INFRA-2026-123456",
  projectId: "AMEFIP-1",
  category: "quality",
  status: "reviewing",
  publicDescription: "Privacy-reviewed public summary",
  region: "03",
  province: "Pampanga",
  municipality: "San Fernando",
  barangay: "Dolores",
  evidence: [
    {
      type: "image",
      url: "https://storage.example/evidence.jpg",
      name: "evidence.jpg",
      lat: 15.028,
      lon: 120.694,
      accuracy: 3,
    },
  ],
  resolvedAt: null,
  createdAt: new Date("2026-08-24T00:00:00.000Z"),
  updatedAt: new Date("2026-08-24T01:00:00.000Z"),
  projectName: "Public project",
};

test("public issue listing DTO omits reporter PII, internal priority, exact landmark, and evidence coordinates", () => {
  const data = formatPublicIssue(row) as Record<string, unknown>;

  for (const forbidden of [
    "reporter",
    "reporterName",
    "reporterPhone",
    "reporterEmail",
    "isAnonymous",
    "priority",
    "rawStatus",
    "landmark",
    "streetLandmark",
  ]) {
    assert.equal(Object.hasOwn(data, forbidden), false, forbidden);
  }

  const evidence = data.evidence as Array<Record<string, unknown>>;
  assert.deepEqual(evidence, []);
  assert.equal(data.description, "Privacy-reviewed public summary");
  assert.equal(data.city, "");
  assert.equal(data.barangay, "");
});
