import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateManagerialDashboardRows,
  buildDashboardConditionDescriptors,
  comparePriorityProjects,
  enforceDashboardRowLimit,
  hasReportedPhysicalProgress,
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
  hasPhysicalProgressEvidence: true,
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

test("does not invent an alert when no project is delayed or at risk", () => {
  const data = aggregateManagerialDashboardRows(
    [{ ...baseRow, targetCompletionDate: new Date("2026-10-31T00:00:00+08:00"), physicalProgress: 60 }],
    {},
    "2026-08-10",
  );
  assert.equal(data.insights.some((insight) => /exposure|delayed/i.test(insight.title)), false);
});

test("surfaces high-value delayed allocation as a critical insight", () => {
  const data = aggregateManagerialDashboardRows(
    [{ ...baseRow, allocatedBudget: "50000000", targetCompletionDate: new Date("2026-08-01T00:00:00+08:00") }],
    {},
    "2026-08-10",
  );
  assert.equal(data.insights[0]?.severity, "critical");
  assert.match(data.insights[0]?.detail ?? "", /50,000,000/);
});

test("does not name a regional bottleneck below the five-project sample minimum", () => {
  const rows = Array.from({ length: 4 }, (_, index) => ({
    ...baseRow,
    projectId: `delayed-${index}`,
    targetCompletionDate: new Date("2026-08-01T00:00:00+08:00"),
  }));
  const data = aggregateManagerialDashboardRows(rows, {}, "2026-08-10");
  assert.equal(data.insights.some((insight) => /highest delayed-project rate/i.test(insight.title)), false);
});

test("warns when priority projects are due within 30 days", () => {
  const data = aggregateManagerialDashboardRows([baseRow], {}, "2026-08-10");
  assert.equal(data.insights.some((insight) => /approaching target dates/i.test(insight.title)), true);
});

test("warns when schedule coverage is materially incomplete", () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({ ...baseRow, projectId: `missing-${index}`, startDate: null }));
  const data = aggregateManagerialDashboardRows(rows, {}, "2026-08-10");
  assert.equal(data.insights.some((insight) => /coverage is limited/i.test(insight.title)), true);
});

test("breaks tied priority severity by larger allocated budget", () => {
  const data = aggregateManagerialDashboardRows(
    [
      { ...baseRow, projectId: "small", physicalProgress: 20, allocatedBudget: "100" },
      { ...baseRow, projectId: "large", physicalProgress: 20, allocatedBudget: "1000" },
    ],
    {},
    "2026-08-10",
  );
  assert.deepEqual(data.priorityProjects.map((project) => project.projectId), ["large", "small"]);
});

test("does not assess or count progress when ABEMIS has no progress evidence", () => {
  const data = aggregateManagerialDashboardRows(
    [{ ...baseRow, physicalProgress: 0, hasPhysicalProgressEvidence: false }],
    {},
    "2026-08-10",
  );
  assert.equal(data.coverage.withPhysicalProgress, 0);
  assert.equal(data.scheduleHealth.find((item) => item.key === "notAssessed")?.count, 1);
  assert.equal(data.kpis.atRiskProjects, 0);
});

test("accepts a reported zero but rejects absent or blank POW progress evidence", () => {
  assert.equal(hasReportedPhysicalProgress({ powRelation: [{ actual: "0" }] }), true);
  assert.equal(hasReportedPhysicalProgress({ powRelation: [{ actual: "" }] }), false);
  assert.equal(hasReportedPhysicalProgress({ powRelation: [] }), false);
  assert.equal(hasReportedPhysicalProgress(null), false);
});

test("rejects oversized dashboard scopes instead of silently truncating totals", () => {
  assert.throws(() => enforceDashboardRowLimit(30_001), /narrow/i);
  assert.doesNotThrow(() => enforceDashboardRowLimit(30_000));
});

test("regional delay rates use assessed projects and remain deterministic on ties", () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, index) => ({
      ...baseRow,
      projectId: `b-${index}`,
      region: "Beta",
      targetCompletionDate: "2026-08-01",
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      ...baseRow,
      projectId: `a-${index}`,
      region: "Alpha",
      targetCompletionDate: "2026-08-01",
    })),
    { ...baseRow, projectId: "a-missing", region: "Alpha", hasPhysicalProgressEvidence: false },
  ];
  const data = aggregateManagerialDashboardRows(rows, {}, "2026-08-10");
  assert.equal(data.regions.find((item) => item.region === "Alpha")?.assessed, 5);
  assert.equal(
    data.insights.find((item) => item.title.includes("highest delayed"))?.filter?.region,
    "Alpha",
  );
});

test("priority ordering uses overdue days before stable project identity", () => {
  const data = aggregateManagerialDashboardRows(
    [
      { ...baseRow, projectId: "z", targetCompletionDate: "2026-08-01" },
      { ...baseRow, projectId: "a", targetCompletionDate: "2026-07-20" },
      { ...baseRow, projectId: "b", targetCompletionDate: "2026-07-20" },
    ],
    {},
    "2026-08-10",
  );
  assert.deepEqual(data.priorityProjects.map((item) => item.projectId), ["a", "b", "z"]);
});
