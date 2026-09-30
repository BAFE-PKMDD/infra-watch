import assert from "node:assert/strict";
import { test } from "bun:test";

import { processKnowledgeBaseDocument } from "./knowledge-base-processing-client";

test("requests protected knowledge-base processing with the current session", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchFn: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return Response.json({ success: true, chunksProcessed: 2, totalChunks: 2 });
  };

  const result = await processKnowledgeBaseDocument("doc-1", fetchFn);
  const captured = calls[0];

  assert.deepEqual(result, { chunksProcessed: 2, totalChunks: 2 });
  assert.equal(captured?.input, "/api/knowledge-base/process");
  assert.equal(captured?.init?.method, "POST");
  assert.equal(captured?.init?.credentials, "include");
  assert.deepEqual(JSON.parse(String(captured?.init?.body)), { documentId: "doc-1" });
});

test("surfaces a safe processing error from a rejected request", async () => {
  const fetchFn: typeof fetch = async () => Response.json(
    { error: "Insufficient permissions." },
    { status: 403 },
  );

  await assert.rejects(
    () => processKnowledgeBaseDocument("doc-1", fetchFn),
    /Insufficient permissions/,
  );
});
