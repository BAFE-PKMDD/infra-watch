import assert from "node:assert/strict";
import test from "node:test";

import { getPublicProjects } from "./public-projects.query";

const integrationTest = process.env.RUN_DB_INTEGRATION_TESTS === "true" ? test : test.skip;

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
