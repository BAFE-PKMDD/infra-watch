import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnowledgeBaseProcessPostHandler,
  type KnowledgeBaseProcessRouteDependencies,
} from "./handler";

function request(body: unknown = { documentId: "doc-1" }) {
  return new Request("http://localhost/api/knowledge-base/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(
  overrides: Partial<KnowledgeBaseProcessRouteDependencies> = {},
): KnowledgeBaseProcessRouteDependencies {
  return {
    getSessionUser: async () => ({ id: "moderator-1", role: "moderator" }),
    canEmbedKnowledgeBase: () => true,
    processDocument: async () => ({ chunksProcessed: 2, totalChunks: 2 }),
    ...overrides,
  };
}

test("rejects unauthenticated processing before invoking the mutation service", async () => {
  let processCalls = 0;
  const response = await createKnowledgeBaseProcessPostHandler(dependencies({
    getSessionUser: async () => null,
    processDocument: async () => {
      processCalls += 1;
      return { chunksProcessed: 1, totalChunks: 1 };
    },
  }))(request());

  assert.equal(response.status, 401);
  assert.equal(processCalls, 0);
});

test("rejects a signed-in role without knowledge-base embed permission", async () => {
  let processCalls = 0;
  const response = await createKnowledgeBaseProcessPostHandler(dependencies({
    getSessionUser: async () => ({ id: "citizen-1", role: "citizen" }),
    canEmbedKnowledgeBase: () => false,
    processDocument: async () => {
      processCalls += 1;
      return { chunksProcessed: 1, totalChunks: 1 };
    },
  }))(request());

  assert.equal(response.status, 403);
  assert.equal(processCalls, 0);
});

test("validates the document identifier after authorization", async () => {
  let processCalls = 0;
  const response = await createKnowledgeBaseProcessPostHandler(dependencies({
    processDocument: async () => {
      processCalls += 1;
      return { chunksProcessed: 1, totalChunks: 1 };
    },
  }))(request({ documentId: "" }));

  assert.equal(response.status, 400);
  assert.equal(processCalls, 0);
});

test("allows an authorized moderator to process a document", async () => {
  let processedId: string | null = null;
  const response = await createKnowledgeBaseProcessPostHandler(dependencies({
    processDocument: async (documentId) => {
      processedId = documentId;
      return { chunksProcessed: 3, totalChunks: 4 };
    },
  }))(request());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(processedId, "doc-1");
  assert.deepEqual(await response.json(), {
    success: true,
    chunksProcessed: 3,
    totalChunks: 4,
  });
});

test("does not disclose processing exception details", async () => {
  const response = await createKnowledgeBaseProcessPostHandler(dependencies({
    processDocument: async () => {
      throw new Error("password=secret database detail");
    },
  }))(request());

  assert.equal(response.status, 500);
  const body = await response.text();
  assert.match(body, /processing failed/i);
  assert.doesNotMatch(body, /password|secret|database detail/i);
});
