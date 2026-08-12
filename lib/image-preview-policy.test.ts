import assert from "node:assert/strict";
import test from "node:test";

import { isTrustedImagePreviewUrl } from "./image-preview-policy";

test("accepts only origins configured for Next image previews", () => {
  assert.equal(isTrustedImagePreviewUrl("https://storage.bafe.gov.ph/infra-watch/a.jpg"), true);
  assert.equal(isTrustedImagePreviewUrl("https://abemis.bafe.gov.ph/media/a.jpg"), true);
  assert.equal(isTrustedImagePreviewUrl("https://lh3.googleusercontent.com/a.jpg"), true);
  assert.equal(isTrustedImagePreviewUrl("http://localhost:9000/infra-watch/a.jpg"), true);
  assert.equal(isTrustedImagePreviewUrl("http://127.0.0.1:9000/infra-watch/a.jpg"), true);
});

test("rejects invalid, downgraded, and unapproved historical origins", () => {
  assert.equal(isTrustedImagePreviewUrl("not a url"), false);
  assert.equal(isTrustedImagePreviewUrl("http://storage.bafe.gov.ph/a.jpg"), false);
  assert.equal(isTrustedImagePreviewUrl("https://storage.bafe.online/a.jpg"), false);
  assert.equal(isTrustedImagePreviewUrl("https://legacy.example/a.jpg"), false);
  assert.equal(isTrustedImagePreviewUrl("https://googleusercontent.com.evil.example/a.jpg"), false);
});
