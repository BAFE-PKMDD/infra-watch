import assert from "node:assert/strict";
import test from "node:test";

import { safePublicSourceMediaUrl, sanitizePublicSourceGeotags } from "./public-source-media";

test("allows only approved HTTPS source-media hosts", () => {
  assert.equal(
    safePublicSourceMediaUrl("https://storage.bafe.gov.ph/projects/photo.jpg"),
    "https://storage.bafe.gov.ph/projects/photo.jpg",
  );
  assert.equal(
    safePublicSourceMediaUrl("https://abemis.bafe.gov.ph/uploads/photo.jpg"),
    "https://abemis.bafe.gov.ph/uploads/photo.jpg",
  );
});

test("rejects active content, insecure transport, and lookalike hosts", () => {
  assert.equal(safePublicSourceMediaUrl("javascript:alert(1)"), null);
  assert.equal(safePublicSourceMediaUrl("data:image/svg+xml,<svg/>"), null);
  assert.equal(safePublicSourceMediaUrl("http://storage.bafe.gov.ph/photo.jpg"), null);
  assert.equal(safePublicSourceMediaUrl("https://storage.bafe.gov.ph.evil.example/photo.jpg"), null);
  assert.equal(safePublicSourceMediaUrl("not a url"), null);
});

test("rebuilds source geotags with only normalized allowlisted URLs", () => {
  assert.deepEqual(sanitizePublicSourceGeotags([
    { id: "safe", lat: 14.5, url: "https://storage.bafe.gov.ph/photo one.jpg" },
    { id: "unsafe", url: "https://storage.bafe.gov.ph/\" onerror=\"alert(1)" },
    { id: "foreign", photo_url: "https://evil.example/photo.jpg" },
  ]), [
    {
      id: "safe",
      lat: 14.5,
      url: "https://storage.bafe.gov.ph/photo%20one.jpg",
      photo_url: "https://storage.bafe.gov.ph/photo%20one.jpg",
    },
    {
      id: "unsafe",
      url: "https://storage.bafe.gov.ph/%22%20onerror=%22alert(1)",
      photo_url: "https://storage.bafe.gov.ph/%22%20onerror=%22alert(1)",
    },
  ]);
});
