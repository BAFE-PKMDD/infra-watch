import assert from "node:assert/strict";
import test from "node:test";

import {
  safePublicSourceMediaUrl,
  sanitizePublicProjectMetadata,
  sanitizePublicSourceGeotags,
} from "./public-source-media";

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

test("rebuilds source geotags without arbitrary source metadata", () => {
  assert.deepEqual(sanitizePublicSourceGeotags([
    {
      id: "internal-id",
      uploaderName: "Private Person",
      latitude: "14.5",
      longitude: "121.0",
      category: "Progress Photos",
      url: "https://storage.bafe.gov.ph/photo one.jpg",
    },
    { id: "unsafe", url: "https://storage.bafe.gov.ph/\" onerror=\"alert(1)" },
    { id: "foreign", photo_url: "https://evil.example/photo.jpg" },
  ]), [
    {
      latitude: "14.5",
      longitude: "121.0",
      category: "Progress Photos",
      url: "https://storage.bafe.gov.ph/photo%20one.jpg",
      photo_url: "https://storage.bafe.gov.ph/photo%20one.jpg",
    },
    {
      url: "https://storage.bafe.gov.ph/%22%20onerror=%22alert(1)",
      photo_url: "https://storage.bafe.gov.ph/%22%20onerror=%22alert(1)",
    },
  ]);
});

test("constructs an explicit public metadata DTO and drops personal or internal fields", () => {
  assert.deepEqual(
    sanitizePublicProjectMetadata(
      {
        beneficiary: "Named household",
        uploaderName: "Private Person",
        internalToken: "secret",
        geotag: [{ uploaderName: "Private Person", url: "https://storage.bafe.gov.ph/photo.jpg" }],
        proposalDocuments: [{
          id: "internal-document-id",
          uploadedBy: "Private Person",
          file_name: "Program of Work.pdf",
          category: "POW",
          url: "https://storage.bafe.gov.ph/pow.pdf",
        }],
      },
      { physicalProgress: 25, coordinates: "14.5, 121" },
    ),
    {
      physicalProgress: 25,
      coordinates: "14.5, 121",
      geotag: [{
        url: "https://storage.bafe.gov.ph/photo.jpg",
        photo_url: "https://storage.bafe.gov.ph/photo.jpg",
      }],
      geotags: [{
        url: "https://storage.bafe.gov.ph/photo.jpg",
        photo_url: "https://storage.bafe.gov.ph/photo.jpg",
      }],
      proposalDocuments: [{
        file_name: "Program of Work.pdf",
        category: "POW",
        url: "https://storage.bafe.gov.ph/pow.pdf",
      }],
      powRelation: [],
      procurementRelation: [],
    },
  );
});
