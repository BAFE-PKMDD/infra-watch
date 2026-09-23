import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicReadPolicy,
  getStorageAccessForPath,
  getStorageBucketForPath,
  policyAllowsAnonymousRead,
} from "./minio";

const privatePaths = [
  "knowledge-base/1730000000000-0123456789abcdef0123456789abcdef.pdf",
  "issue-evidence/1730000000000-0123456789abcdef0123456789abcdef.jpg",
];

const publicPaths = [
  "feedback/1730000000000-0123456789abcdef0123456789abcdef.jpg",
  "live-videos/1730000000000-0123456789abcdef0123456789abcdef.mp4",
];

test("routes knowledge-base documents and issue evidence to private storage", () => {
  for (const path of privatePaths) {
    assert.equal(getStorageAccessForPath(path), "private", path);
    assert.notEqual(
      getStorageBucketForPath(path),
      getStorageBucketForPath("feedback/example.jpg"),
      path,
    );
  }
});

test("keeps intentionally public media in the public storage bucket", () => {
  for (const path of publicPaths) {
    assert.equal(getStorageAccessForPath(path), "public", path);
  }
});

test("fails closed when public and private storage buckets are configured with the same name", () => {
  assert.throws(
    () => getStorageBucketForPath("knowledge-base/document.pdf", {
      publicBucket: "shared",
      privateBucket: "shared",
    }),
    /must use different buckets/i,
  );
});

test("public bucket policy exposes only approved public-media prefixes", () => {
  const policy = buildPublicReadPolicy("infra-watch");
  const resources = policy.Statement.flatMap((statement) => statement.Resource);

  assert.deepEqual(resources.sort(), [
    "arn:aws:s3:::infra-watch/feedback-comment/*",
    "arn:aws:s3:::infra-watch/feedback/*",
    "arn:aws:s3:::infra-watch/live-videos/*",
  ]);
  assert.equal(resources.includes("arn:aws:s3:::infra-watch/*"), false);
  assert.equal(resources.some((resource) => /knowledge-base|issue-evidence/.test(resource)), false);
});

test("rejects every anonymous Allow on the private bucket", () => {
  for (const statement of [
    { Effect: "Allow", Principal: "*", Action: "s3:GetObject" },
    { Effect: "Allow", Principal: "*", Action: "s3:GetObj*" },
    { Effect: "Allow", Principal: "*", Action: "s3:*Object" },
    { Effect: "Allow", Principal: "*", Action: "S3:GETOBJECT" },
    { Effect: "Allow", Principal: { AWS: ["*"] }, NotAction: "s3:PutObject" },
    { Effect: "Allow", NotPrincipal: { AWS: ["internal-role"] }, Action: "s3:GetObject" },
  ]) {
    assert.equal(policyAllowsAnonymousRead(JSON.stringify({ Statement: [statement] })), true);
  }

  assert.equal(policyAllowsAnonymousRead(JSON.stringify({
    Statement: [{ Effect: "Allow", Principal: { AWS: ["internal-role"] }, Action: "s3:GetObject" }],
  })), false);
  assert.equal(policyAllowsAnonymousRead("not-json"), true);
});
