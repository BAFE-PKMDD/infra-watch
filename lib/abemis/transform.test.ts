import assert from "node:assert/strict";
import test from "node:test";

import type { AbemisProject } from "@/types/api.types";
import { isInfraWatchProject } from "./transform";

function project(projectType: string | null | undefined) {
  return { project_type: projectType } as AbemisProject;
}

test("excludes Farm-to-Market Road records owned by FMR Watch", () => {
  const fmrTypes = [
    "Farm-to-Market Road",
    " farm-to-market road ",
    "FARM TO MARKET ROAD",
    "Farm–to–Market Road",
  ];

  for (const projectType of fmrTypes) {
    assert.equal(isInfraWatchProject(project(projectType)), false);
  }
});

test("keeps non-FMR infrastructure records in InfraWatch", () => {
  const infraTypes = [
    "Solar-Powered Irrigation System",
    "Greenhouse",
    "Farm-to-Mill Road",
    null,
  ];

  for (const projectType of infraTypes) {
    assert.equal(isInfraWatchProject(project(projectType)), true);
  }
});
