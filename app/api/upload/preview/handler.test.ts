import assert from "node:assert/strict";
import test from "node:test";

import {
  createUploadPreviewGetHandler,
  type UploadPreviewDependencies,
} from "./handler";

function request(path: string) {
  return new Request(`http://localhost/api/upload/preview?path=${encodeURIComponent(path)}`);
}

function dependencies(overrides: Partial<UploadPreviewDependencies> = {}): UploadPreviewDependencies {
  return {
    getSessionUser: async () => ({ id: "citizen-1", role: "citizen" }),
    canReadKnowledgeBase: () => false,
    canReadIssueEvidence: async () => true,
    loadMedia: async () => Buffer.from("private-media"),
    ...overrides,
  };
}

test("private media preview requires authentication", async () => {
  let loadCalls = 0;
  const response = await createUploadPreviewGetHandler(dependencies({
    getSessionUser: async () => null,
    loadMedia: async () => {
      loadCalls += 1;
      return Buffer.from("should-not-load");
    },
  }))(request("issue-evidence/1730000000000-0123456789abcdef0123456789abcdef.jpg"));

  assert.equal(response.status, 401);
  assert.equal(loadCalls, 0);
});

test("knowledge-base preview requires knowledge-base read permission", async () => {
  let loadCalls = 0;
  const response = await createUploadPreviewGetHandler(dependencies({
    loadMedia: async () => {
      loadCalls += 1;
      return Buffer.from("should-not-load");
    },
  }))(request("knowledge-base/1730000000000-0123456789abcdef0123456789abcdef.pdf"));

  assert.equal(response.status, 403);
  assert.equal(loadCalls, 0);
});

test("an authenticated user can load issue evidence they own or manage", async () => {
  const response = await createUploadPreviewGetHandler(dependencies())(
    request("issue-evidence/1730000000000-0123456789abcdef0123456789abcdef.jpg"),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(await response.text(), "private-media");
});

test("denies issue evidence to an authenticated user who does not own or manage its issue", async () => {
  let loadCalls = 0;
  const response = await createUploadPreviewGetHandler(dependencies({
    canReadIssueEvidence: async () => false,
    loadMedia: async () => {
      loadCalls += 1;
      return Buffer.from("should-not-load");
    },
  }))(request("issue-evidence/1730000000000-0123456789abcdef0123456789abcdef.jpg"));

  assert.equal(response.status, 403);
  assert.equal(loadCalls, 0);
});

test("rejects malformed or unsupported preview paths before storage access", async () => {
  let loadCalls = 0;
  for (const path of [
    "../.env",
    "issue-evidence/not-generated.jpg",
    "knowledge-base/1730000000000-0123456789abcdef0123456789abcdef.exe",
  ]) {
    const response = await createUploadPreviewGetHandler(dependencies({
      loadMedia: async () => {
        loadCalls += 1;
        return Buffer.from("should-not-load");
      },
    }))(request(path));
    assert.equal(response.status, 400, path);
  }
  assert.equal(loadCalls, 0);
});
