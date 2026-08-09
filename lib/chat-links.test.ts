import assert from "node:assert/strict";
import test from "node:test";

import { getProjectHref, isProjectHref } from "./chat-links";

test("creates project overview links for ABEMIS IDs", () => {
  const identifiers = [
    "2025-R8-LEY-INFRA-FMRDP-FMR-00926",
    "2020-CAR-ABR-INFRA-NRP-I-00030",
    "1997-R4B-OCM-INFRA-PR-STWxSx-00076",
    "2018-R7-CEB-INFRA-N/A-RFO-00052",
    "17102",
  ];

  for (const identifier of identifiers) {
    assert.equal(
      getProjectHref(identifier),
      `/projects/${encodeURIComponent(identifier)}`,
    );
  }
});

test("creates project overview links for UUID project IDs", () => {
  assert.equal(
    getProjectHref("123e4567-e89b-42d3-a456-426614174000"),
    "/projects/123e4567-e89b-42d3-a456-426614174000",
  );
});

test("does not turn ordinary inline code into project links", () => {
  assert.equal(getProjectHref("npm run build"), null);
  assert.equal(getProjectHref("getProjectStats"), null);
});

test("recognizes only local project overview links", () => {
  assert.equal(isProjectHref("/projects/2025-R8-LEY-INFRA-FMRDP-FMR-00926"), true);
  assert.equal(isProjectHref("/projects/2020-CAR-ABR-INFRA-NRP-I-00030"), true);
  assert.equal(isProjectHref("/projects/1997-R4B-OCM-INFRA-PR-STWxSx-00076"), true);
  assert.equal(isProjectHref("/projects/2018-R7-CEB-INFRA-N%2FA-RFO-00052"), true);
  assert.equal(isProjectHref("/projects/17102"), true);
  assert.equal(isProjectHref("https://example.com/projects/123"), false);
  assert.equal(isProjectHref("/projects/../admin-projects"), false);
  assert.equal(isProjectHref("/projects/..%2Fadmin-projects"), false);
});
