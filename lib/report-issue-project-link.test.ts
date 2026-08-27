import assert from "node:assert/strict";
import test from "node:test";

import { buildReportIssuePath, projectPreviewToSelectedProject } from "./report-issue-project-link.ts";

test("builds a project-linked report path without allowing query injection", () => {
  assert.equal(buildReportIssuePath("A&B?admin=true"), "/report-issue/new?projectId=A%26B%3Fadmin%3Dtrue");
});

test("maps a public project preview into the report form selection contract", () => {
  assert.deepEqual(projectPreviewToSelectedProject({
    id: "AMEFIP-1",
    name: "Solar dryer",
    code: "CODE-1",
    province: "Leyte",
    city: "Tacloban",
  }), {
    id: "AMEFIP-1",
    name: "Solar dryer",
    sourceId: "AMEFIP-1",
    sourceProjectId: "CODE-1",
    province: "Leyte",
    municipality: "Tacloban",
  });
});
