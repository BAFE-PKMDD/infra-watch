import assert from "node:assert/strict";
import { test } from "bun:test";

import { resolveApprovedPublicImagePath } from "./public-issue-evidence";

const APPROVED = "2026-10-06T00:00:00.000Z";
const PATH = "issue-evidence/1760000000000-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg";

const published = {
  publicApprovedAt: new Date(APPROVED),
  publicDescription: "Reviewed public summary",
};

test("resolves the storage path for any image on a published issue", () => {
  const evidence = [{ type: "image" as const, url: PATH }];
  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence }, 0), PATH);
});

test("accepts legacy full storage URLs but never returns a non-evidence path", () => {
  const legacy = [{ type: "image" as const, url: `https://storage.bafe.gov.ph/infra-watch/${PATH}`, publicApprovedAt: APPROVED }];
  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence: legacy }, 0), PATH);

  const other = [{ type: "image" as const, url: "knowledge-base/1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf", publicApprovedAt: APPROVED }];
  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence: other }, 0), null);
});

test("refuses videos, bad indexes, and unpublished issues", () => {
  const evidence = [
    { type: "image" as const, url: PATH },
    { type: "video" as const, url: "issue-evidence/2-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mp4" },
    { type: "image" as const, url: PATH },
  ];

  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence }, 1), null);
  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence }, 9), null);
  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence }, -1), null);
  assert.equal(resolveApprovedPublicImagePath({ ...published, publicApprovedAt: null, evidence }, 2), null);
  assert.equal(resolveApprovedPublicImagePath({ ...published, publicDescription: null, evidence }, 2), null);
  assert.equal(resolveApprovedPublicImagePath({ ...published, evidence: null }, 0), null);
});
