import assert from "node:assert/strict";
import test from "node:test";

import {
  createIssueDetailGetHandler,
  type IssueDetailRouteDependencies,
  type IssueDetailRow,
} from "./route";

const issue: IssueDetailRow = {
  id: "11111111-1111-4111-8111-111111111111",
  ticketNumber: "INFRA-2026-123456",
  projectId: "AMEFIP-1",
  reporterUserId: "owner-1",
  reporterName: "Private Reporter",
  reporterContact: "+639171234567",
  reporterEmail: "private@example.com",
  isAnonymous: false,
  category: "delay",
  status: "pending",
  description: "Private issue description",
  publicDescription: null,
  publicApprovedAt: null,
  region: "Region III",
  province: "Pampanga",
  municipality: "San Fernando",
  barangay: "Example",
  landmark: "Private home landmark",
  latitude: 15.0,
  longitude: 120.0,
  evidence: [
    { type: "image", url: "https://storage.example/evidence.jpg", name: "evidence.jpg", lat: 15.1, lon: 120.1, accuracy: 3 },
  ],
  geoVideoTrack: [{ lat: 15.1, lon: 120.1, accuracy: 3, timeSeconds: 0 }],
  geoVideoUrl: "https://storage.example/evidence.mp4",
  resolvedAt: null,
  createdAt: new Date("2026-08-24T00:00:00Z"),
  updatedAt: new Date("2026-08-24T01:00:00Z"),
  projectName: "Example Project",
};

function dependencies(
  overrides: Partial<IssueDetailRouteDependencies> = {},
): IssueDetailRouteDependencies {
  return {
    getSessionUser: async () => null,
    loadIssue: async () => issue,
    getResponses: async () => [],
    ...overrides,
  };
}

function request() {
  return new Request(`http://localhost/api/issues/${issue.ticketNumber}`);
}

const context = { params: Promise.resolve({ id: issue.ticketNumber }) };

test("anonymous callers cannot enumerate pending issue details", async () => {
  const response = await createIssueDetailGetHandler(dependencies())(request(), context);
  assert.equal(response.status, 404);
});

test("a signed-in non-owner cannot enumerate another citizen's pending issue", async () => {
  const response = await createIssueDetailGetHandler(
    dependencies({ getSessionUser: async () => ({ id: "other-user", role: "citizen" }) }),
  )(request(), context);
  assert.equal(response.status, 404);
});

test("the reporter can view their own pending issue details", async () => {
  const response = await createIssueDetailGetHandler(
    dependencies({ getSessionUser: async () => ({ id: "owner-1", role: "citizen" }) }),
  )(request(), context);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { data: Record<string, unknown> };
  assert.equal(payload.data.reporterPhone, "+639171234567");
  assert.equal(payload.data.reporterEmail, "private@example.com");
  assert.deepEqual(payload.data.geoVideoTrack, issue.geoVideoTrack);
});

test("workflow review alone does not publish a citizen's raw issue description", async () => {
  const response = await createIssueDetailGetHandler(
    dependencies({ loadIssue: async () => ({ ...issue, status: "reviewing" }) }),
  )(request(), context);
  assert.equal(response.status, 404);
});

test("explicitly approved public issue details use the reviewed summary and redact precise location data", async () => {
  const response = await createIssueDetailGetHandler(
    dependencies({
      loadIssue: async () => ({
        ...issue,
        status: "reviewing",
        publicDescription: "Privacy-reviewed public summary without citizen PII.",
        publicApprovedAt: new Date("2026-08-24T01:30:00Z"),
      }),
      getResponses: async () => [{
        id: "22222222-2222-4222-8222-222222222222",
        message: "Public response message",
        statusChange: "Internal transition rationale",
        newStatus: null,
        attachmentUrls: ["https://storage.example/internal-attachment.pdf"],
        internalNotes: "Private staff-only note",
        isInternalOnly: false,
        createdAt: new Date("2026-08-24T02:00:00Z"),
        updatedAt: new Date("2026-08-24T02:00:00Z"),
        responder: {
          id: "staff-private-id",
          name: "Private Staff Name",
          role: "moderator",
        },
        responderName: "Private Staff Name",
      }],
    }),
  )(request(), context);
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { data: Record<string, unknown> };
  const serialized = JSON.stringify(payload);
  assert.equal(payload.data.description, "Privacy-reviewed public summary without citizen PII.");
  assert.equal(payload.data.municipality, "");
  assert.equal(payload.data.barangay, "");
  assert.doesNotMatch(
    serialized,
    /Private issue description|Private Reporter|639171234567|private@example\.com|Private home landmark|evidence\.mp4|evidence\.jpg|Private staff-only note|Internal transition rationale|Private Staff Name|staff-private-id|internal-attachment|San Fernando/,
  );
  for (const forbidden of [
    "reporter",
    "reporterName",
    "reporterPhone",
    "reporterEmail",
    "isAnonymous",
    "priority",
    "landmark",
    "streetLandmark",
    "latitude",
    "longitude",
    "geoVideoTrack",
    "geoVideoUrl",
  ]) {
    assert.equal(Object.hasOwn(payload.data, forbidden), false, forbidden);
  }
  assert.deepEqual(payload.data.evidence, []);
  assert.deepEqual(payload.data.responses, [
    {
      id: "22222222-2222-4222-8222-222222222222",
      message: "Public response message",
      statusChange: null,
      newStatus: null,
      attachmentUrls: [],
      createdAt: "2026-08-24T02:00:00.000Z",
      updatedAt: "2026-08-24T02:00:00.000Z",
      responder: { name: "InfraWatch staff", role: "staff" },
      responderName: "InfraWatch staff",
    },
  ]);
});

test("staff using the public route still receive the redacted public DTO", async () => {
  const response = await createIssueDetailGetHandler(
    dependencies({
      getSessionUser: async () => ({ id: "admin-1", role: "admin" }),
      loadIssue: async () => ({
        ...issue,
        status: "resolved",
        publicDescription: "Approved public summary for this issue.",
        publicApprovedAt: new Date("2026-08-24T01:30:00Z"),
      }),
    }),
  )(request(), context);
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /Private Reporter|639171234567|private@example\.com/);
});

test("response-store failures return a retryable unavailable result instead of empty history", async () => {
  const response = await createIssueDetailGetHandler(
    dependencies({
      loadIssue: async () => ({
        ...issue,
        publicDescription: "Approved public summary for this issue.",
        publicApprovedAt: new Date("2026-08-24T01:30:00Z"),
      }),
      getResponses: async () => { throw new Error("database unavailable"); },
    }),
  )(request(), context);
  assert.equal(response.status, 503);
  assert.match(await response.text(), /temporarily unavailable/i);
});
