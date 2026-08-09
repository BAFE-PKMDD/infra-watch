import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateManagerialDashboardRows,
  buildDashboardConditionDescriptors,
  comparePriorityProjects,
  type DashboardProjectRow,
} from "./managerial-dashboard-query";

const baseRow: DashboardProjectRow = {
  projectId: "p-1",
  projectName: "Irrigation rehabilitation",
  program: "AMEFIP",
  region: "Region VIII",
  province: "Leyte",
  projectType: "Irrigation",
  yearFunded: "2026",
  status: "ongoing",
  allocatedBudget: "1000000.00",
  approvedBudgetForContract: 900000,
  physicalProgress: 50,
  startDate: new Date("2026-07-01T00:00:00+08:00"),
  targetCompletionDate: new Date("2026-09-08T00:00:00+08:00"),
  actualCompletionDate: null,
  lastSyncedAt: new Date("2026-08-10T01:00:00+08:00"),
};

test("always includes moderator region and agency scope descriptors", () => {
  const descriptors = buildDashboardConditionDescriptors(
    {},
    { role: "moderator", region: "08", assignedAgency: "AMEFIP" },
  );
  assert.deepEqual(descriptors, [
    { source: "scope", field: "region", value: "08" },
    { source: "scope", field: "program", value: "AMEFIP" },
  ]);
});

test("does not add artificial scope restrictions for an admin", () => {
  assert.deepEqual(
    buildDashboardConditionDescriptors({}, { role: "admin", region: "08" }),
    [],
  );
});

test("represents every global filter in one shared condition specification", () => {
  const descriptors = buildDashboardConditionDescriptors(
    {
      program: "INS",
      year: "2026",
      region: "Region VIII",
      province: "Leyte",
      projectType: "Road",
      status: "ongoing",
      health: "atRisk",
    },
    { role: "admin" },
  );
  assert.deepEqual(
    descriptors.map(({ field }) => field),
    ["program", "year", "region", "province", "projectType", "status", "health"],
  );
});

test("keeps missing dimensions in an explicit Unknown bucket", () => {
  const data = aggregateManagerialDashboardRows(
    [{ ...baseRow, region: null, projectType: null }],
    {},
    "2026-08-10",
  );
  assert.equal(data.regions[0]?.region, "Unknown");
  assert.equal(data.projectTypes[0]?.projectType, "Unknown");
});

test("returns zero rates instead of NaN or Infinity for an empty portfolio", () => {
  const data = aggregateManagerialDashboardRows([], {}, "2026-08-10");
  assert.equal(data.kpis.completionRate, 0);
  assert.equal(Number.isFinite(data.kpis.completionRate), true);
});

test("counts null budget separately while retaining a known zero", () => {
  const data = aggregateManagerialDashboardRows(
    [
      { ...baseRow, projectId: "zero", allocatedBudget: "0" },
      { ...baseRow, projectId: "missing", allocatedBudget: null },
    ],
    {},
    "2026-08-10",
  );
  assert.equal(data.coverage.total, 2);
  assert.equal(data.coverage.withBudget, 1);
  assert.equal(data.kpis.allocatedBudget, 0);
});

test("priority ordering favors delayed, then larger deficit, then budget exposure", () => {
  const delayed = {
    ...baseRow,
    projectId: "delayed",
    targetCompletionDate: new Date("2026-08-01T00:00:00+08:00"),
  };
  const largerDeficit = {
    ...baseRow,
    projectId: "larger-deficit",
    physicalProgress: 10,
    allocatedBudget: "100",
  };
  const largerBudget = {
    ...baseRow,
    projectId: "larger-budget",
    physicalProgress: 30,
    allocatedBudget: "2000000",
  };

  const data = aggregateManagerialDashboardRows(
    [largerBudget, delayed, largerDeficit],
    {},
    "2026-08-10",
  );
  assert.deepEqual(
    data.priorityProjects.map((project) => project.projectId),
    ["delayed", "larger-deficit", "larger-budget"],
  );
  assert.ok(comparePriorityProjects(data.priorityProjects[0], data.priorityProjects[1]) < 0);
});

test("applies canonical status and schedule-health filters without widening scope", () => {
  const data = aggregateManagerialDashboardRows(
    [
      baseRow,
      { ...baseRow, projectId: "complete", status: "Inventory", physicalProgress: 100 },
    ],
    { status: "completed", health: "notAssessed" },
    "2026-08-10",
  );
  assert.equal(data.kpis.totalProjects, 1);
  assert.equal(data.priorityProjects.length, 0);
});
