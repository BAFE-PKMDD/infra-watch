import assert from "node:assert/strict";
import test from "node:test";

import { getPublicProjects } from "./public-projects.query";
import { formatPublicProjectRecord } from "@/lib/public-project-record";

const integrationTest = process.env.RUN_DB_INTEGRATION_TESTS === "true" ? test : test.skip;

test("preserves unavailable public catalog values instead of fabricating zero or defaults", () => {
  const result = formatPublicProjectRecord({
    id: "local-id",
    abemisId: "AMEFIP-1",
    projectCode: null,
    name: "Warehouse",
    program: null,
    projectType: null,
    region: null,
    province: null,
    municipality: null,
    barangay: null,
    budget: null,
    physicalProgress: 0,
    financialProgress: 0,
    status: "Inventory",
    stage: null,
    implementingAgency: null,
    contractorName: null,
    yearFunded: null,
    lastSyncedAt: new Date("2026-08-10T14:15:00.000Z"),
  });

  assert.equal(result.budget, null);
  assert.equal(result.region, null);
  assert.equal(result.year, null);
  assert.equal(result.contractor, null);
  assert.equal(result.program, "unclassified");
  assert.equal(result.sector, null);
  assert.equal(result.stage, "Completed");
});

integrationTest(
  "returns unique projects across consecutive public catalog pages",
  async () => {
    const projectIds: string[] = [];

    for (let pageParam = 1; pageParam <= 4; pageParam += 1) {
      const page = await getPublicProjects({ pageParam });
      assert.ok(page.totalCount > 0, "the integration database must contain projects");
      projectIds.push(...page.data.map((project) => project.id));
    }

    assert.equal(
      new Set(projectIds).size,
      projectIds.length,
      "public catalog pages must not overlap",
    );
  },
);
