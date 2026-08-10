import assert from "node:assert/strict";
import test from "node:test";

import type { AbemisProject } from "@/types/api.types";
import { isInfraWatchProject, transformAbemisProject } from "./transform";

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

test("uses snake-case ABEMIS relations for progress and schedule provenance", () => {
  const transformed = transformAbemisProject({
    id: "raw-1",
    project_id: "P-1",
    project_title: "Irrigation rehabilitation",
    project_type: "Irrigation",
    calendar_days: "30",
    powRelation: [],
    pow_relation: [{ actual: "25", target: "40" }],
    procurementRelation: [],
    procurement_relation: [
      { milestone: "Notice to Proceed", actual_date: "2026-01-15" },
    ],
  } as unknown as AbemisProject);

  assert.equal(transformed.physicalProgress, 25);
  assert.equal(transformed.financialProgress, 40);
  assert.equal(transformed.startDate?.toISOString(), "2026-01-15T00:00:00.000Z");
  assert.equal(transformed.targetCompletionDate?.toISOString(), "2026-02-14T00:00:00.000Z");
  assert.equal(transformed.metadata.powRelation.length, 1);
  assert.equal(transformed.metadata.procurementRelation.length, 1);
});
