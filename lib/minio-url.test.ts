import assert from "node:assert/strict";
import test from "node:test";

import { getFileUrl, isFeedbackUploadPath, isLocalMinIO } from "./minio-url";
import nextConfig from "../next.config";

const generatedImage = "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.jpg";

test("recognizes only generated feedback media paths", () => {
  for (const path of [
    generatedImage,
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.png",
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.webp",
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.gif",
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.mp4",
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.mov",
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.webm",
  ]) {
    assert.equal(isFeedbackUploadPath(path), true, path);
  }

  for (const path of [
    "../.env",
    "feedback/../../.env",
    "live-videos/1789566130081-be081b09fd31b786f78f87b3319f2deb.jpg",
    "feedback/not-generated.jpg",
    "feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.svg",
    "http://localhost:9000/infra-watch/feedback/1789566130081-be081b09fd31b786f78f87b3319f2deb.jpg",
  ]) {
    assert.equal(isFeedbackUploadPath(path), false, path);
  }
});

test("uses the authenticated preview route for local fallback feedback media", () => {
  const previousEndpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT;
  const previousSsl = process.env.NEXT_PUBLIC_MINIO_USE_SSL;
  const previousBucket = process.env.NEXT_PUBLIC_MINIO_BUCKET;

  process.env.NEXT_PUBLIC_MINIO_ENDPOINT = "localhost:9000";
  process.env.NEXT_PUBLIC_MINIO_USE_SSL = "false";
  process.env.NEXT_PUBLIC_MINIO_BUCKET = "infra-watch";

  try {
    assert.equal(
      getFileUrl(generatedImage),
      `/api/upload/preview?path=${encodeURIComponent(generatedImage)}`,
    );
  } finally {
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT = previousEndpoint;
    process.env.NEXT_PUBLIC_MINIO_USE_SSL = previousSsl;
    process.env.NEXT_PUBLIC_MINIO_BUCKET = previousBucket;
  }
});

test("allows Next Image to render authenticated upload preview URLs", () => {
  const localPatterns = nextConfig.images?.localPatterns ?? [];
  assert.equal(
    localPatterns.some((pattern) => pattern.pathname === "/api/upload/preview"),
    true,
  );
});

test("identifies preview URLs and localhost MinIO URLs as local media", () => {
  assert.equal(isLocalMinIO("/api/upload/preview?path=feedback%2F123.jpg"), true);
  assert.equal(isLocalMinIO("http://localhost:9000/infra-watch/feedback/123.jpg"), true);
  assert.equal(isLocalMinIO("http://127.0.0.1:9000/infra-watch/feedback/123.jpg"), true);
  assert.equal(isLocalMinIO("https://storage.bafe.gov.ph/infra-watch/feedback/123.jpg"), false);
  assert.equal(isLocalMinIO(null), false);
  assert.equal(isLocalMinIO(undefined), false);
});

test("keeps production feedback media on the configured object-storage origin", () => {
  const previousEndpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT;
  const previousSsl = process.env.NEXT_PUBLIC_MINIO_USE_SSL;
  const previousBucket = process.env.NEXT_PUBLIC_MINIO_BUCKET;

  process.env.NEXT_PUBLIC_MINIO_ENDPOINT = "storage.bafe.gov.ph";
  process.env.NEXT_PUBLIC_MINIO_USE_SSL = "true";
  process.env.NEXT_PUBLIC_MINIO_BUCKET = "infra-watch";

  try {
    assert.equal(
      getFileUrl(generatedImage),
      `https://storage.bafe.gov.ph/infra-watch/${generatedImage}`,
    );
  } finally {
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT = previousEndpoint;
    process.env.NEXT_PUBLIC_MINIO_USE_SSL = previousSsl;
    process.env.NEXT_PUBLIC_MINIO_BUCKET = previousBucket;
  }
});
