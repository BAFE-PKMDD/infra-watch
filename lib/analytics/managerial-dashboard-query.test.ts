import assert from "node:assert/strict";
import test from "node:test";
import { and } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { ABEMIS_SYNC_YEARS } from "@/lib/abemis/year-scope";
import {
  aggregateManagerialDashboardRows,
  aggregatePortfolioTrendRows,
  buildDashboardAggregateQueryPlan,
  buildDashboardConditions,
  buildDashboardConditionDescriptors,
  buildDashboardBreakdownQuery,
  buildDashboardScopeCountQuery,
  buildDashboardDrillthroughQueryPlan,
  buildPortfolioTrendQuery,
  comparePriorityProjects,
  currencyFromCents,
  enforceDashboardRowLimit,
  hasReportedPhysicalProgress,
  sumCurrency,
  type DashboardProjectRow,
} from "./managerial-dashboard-query";

test("builds PostgreSQL aggregate and bounded detail queries instead of a portfolio row load", () => {
  const scopeCountSql = buildDashboardScopeCountQuery(
    { health: "delayed" },
    { role: "moderator", region: "08", assignedAgency: "AMEFIP" },
    "2026-08-10",
  ).toSQL().sql;
  assert.match(scopeCountSql, /count\(\*\)/i);
  assert.match(scopeCountSql, /where "health" =/i);

  const plan = buildDashboardAggregateQueryPlan({}, { role: "admin" }, "2026-08-10");
  assert.deepEqual(plan.map(({ name }) => name), [
    "summary",
    "scheduleHealth",
    "statuses",
    "regions",
    "projectTypes",
    "fundingYears",
    "statusByYear",
    "regionProjectTypes",
    "projectTypeStats",
    "procurementModes",
    "completionDelayBuckets",
    "lateDaysByRegion",
    "lateDaysByProjectType",
    "lateRateByContractLength",
    "lateRateByYear",
    "ntpLagByProcurementMode",
    "ongoingOverdueBuckets",
    "ongoingByYear",
    "turnoverBuckets",
    "turnoverByRegion",
    "contractors",
    "progressVariance",
    "priorityProjects",
    "filterOptions",
  ]);

  for (const query of plan) {
    const compiled = query.query.toSQL();
    assert.doesNotMatch(compiled.sql, /limit\s+\$\d+[^]*30001/i);
    if (query.name === "progressVariance") assert.equal(compiled.params.at(-1), 50);
    if (query.name === "priorityProjects") assert.equal(compiled.params.at(-1), 10);
  }

  for (const aggregateName of ["summary", "scheduleHealth", "statuses", "regions", "projectTypes", "fundingYears", "filterOptions"] as const) {
    const sqlText = plan.find(({ name }) => name === aggregateName)!.query.toSQL().sql;
    assert.match(sqlText, /count\(|sum\(|group by|array_agg\(/i);
    assert.match(sqlText, /case when/i);
  }

  const statusByYearSql = plan.find(({ name }) => name === "statusByYear")!.query.toSQL().sql;
  assert.match(statusByYearSql, /group by/i);
  assert.match(statusByYearSql, /count\(|sum\(/i);

  const regionProjectTypesSql = plan.find(({ name }) => name === "regionProjectTypes")!.query.toSQL().sql;
  assert.match(regionProjectTypesSql, /group by/i);
  assert.match(regionProjectTypesSql, /count\(|sum\(/i);

  const projectTypeStatsSql = plan.find(({ name }) => name === "projectTypeStats")!.query.toSQL().sql;
  assert.match(projectTypeStatsSql, /group by/i);
  assert.match(projectTypeStatsSql, /percentile_cont/i);
  assert.match(projectTypeStatsSql, /filter \(where/i);

  for (const aggregateName of ["procurementModes", "lateRateByYear", "ongoingByYear", "turnoverByRegion"] as const) {
    const sqlText = plan.find(({ name }) => name === aggregateName)!.query.toSQL().sql;
    assert.match(sqlText, /group by/i);
    assert.match(sqlText, /count\(|sum\(/i);
  }

  for (const bucketedName of ["completionDelayBuckets", "lateRateByContractLength", "ongoingOverdueBuckets", "turnoverBuckets"] as const) {
    const sqlText = plan.find(({ name }) => name === bucketedName)!.query.toSQL().sql;
    assert.match(sqlText, /group by/i);
    assert.match(sqlText, /case\s*when/i);
  }

  for (const percentileName of ["lateDaysByRegion", "lateDaysByProjectType", "ntpLagByProcurementMode"] as const) {
    const sqlText = plan.find(({ name }) => name === percentileName)!.query.toSQL().sql;
    assert.match(sqlText, /group by/i);
    assert.match(sqlText, /percentile_cont/i);
    assert.match(sqlText, /filter \(where/i);
  }

  const ntpLagSql = plan.find(({ name }) => name === "ntpLagByProcurementMode")!.query.toSQL().sql;
  assert.match(ntpLagSql, /make_date/i);

  const contractorsSql = plan.find(({ name }) => name === "contractors")!.query.toSQL().sql;
  assert.match(contractorsSql, /group by/i);
  assert.match(contractorsSql, /percentile_cont/i);
  assert.match(contractorsSql, /mode\(\) within group/i);
  assert.match(contractorsSql, /coalesce/i);
});

test("chart drill-down breakdown is a grouped aggregate query scoped like every other portfolio read", () => {
  const provinceBreakdown = buildDashboardBreakdownQuery(
    { region: "Region VIII" },
    { role: "moderator", region: "Region VIII", assignedAgency: "AMEFIP" },
    "2026-08-10",
    "province",
  ).toSQL();
  assert.match(provinceBreakdown.sql, /group by/i);
  assert.match(provinceBreakdown.sql, /count\(|sum\(/i);
  assert.match(provinceBreakdown.sql, /"region" =|ilike/i);
  assert.match(provinceBreakdown.sql, /"program" =|ilike.*agency|assigned/i);

  const programBreakdown = buildDashboardBreakdownQuery(
    { projectType: "Irrigation Canal" },
    { role: "admin" },
    "2026-08-10",
    "program",
  ).toSQL();
  assert.match(programBreakdown.sql, /group by/i);
  assert.match(programBreakdown.sql, /"project_type" =|ilike/i);
});

test("builds a scoped and paginated project drill-through query", () => {
  const plan = buildDashboardDrillthroughQueryPlan(
    { region: "Region VIII", health: "delayed" },
    { role: "moderator", region: "Region VIII", assignedAgency: "AMEFIP" },
    "2026-08-26",
    { page: 2, pageSize: 20 },
    { otherProjectTypes: { excluded: ["Warehouse", "Diversion Dam"] } },
  );
  const total = plan.total.toSQL();
  const rows = plan.rows.toSQL();
  assert.match(total.sql, /count\(\*\)/i);
  assert.match(total.sql, /"health" =/i);
  assert.match(total.sql, /not in/i);
  assert.match(total.sql, /btrim/i);
  assert.match(rows.sql, /order by/i);
  assert.match(rows.sql, /limit/i);
  assert.match(rows.sql, /offset/i);
  assert.deepEqual(rows.params.slice(-2), [20, 20]);
  assert.doesNotMatch(rows.sql, /select \*/i);
});

test("translates Unknown dimension filters to null-or-blank SQL predicates", () => {
  const condition = and(
    ...buildDashboardConditions(
      {
        program: "Unknown",
        year: "Unknown",
        region: "Unknown",
        province: "Unknown",
        projectType: "Unknown",
      },
      { role: "admin" },
    ),
  );
  const query = new PgDialect().sqlToQuery(condition!);
  assert.equal((query.sql.match(/is null/g) ?? []).length, 5);
  assert.equal((query.sql.match(/btrim/g) ?? []).length, 5);
  // Every dashboard query is always bounded to the 2021-2026 ABEMIS sync scope,
  // regardless of role or filters, so those are the only bound params here.
  assert.deepEqual(query.params, ABEMIS_SYNC_YEARS);
});

test("sums decimal currency through integer cent arithmetic", () => {
  assert.equal(sumCurrency(["0.10", "0.20", null]), 0.3);
  assert.equal(sumCurrency(["900719925474.09", "0.01"]), 900719925474.1);
  assert.equal(currencyFromCents("30"), 0.3);
  assert.throws(
    () => currencyFromCents((BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)).toString()),
    /safe cent precision/,
  );
});

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
  actualBidAmount: 900000,
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
      { ...baseRow, projectId: "missing", allocatedBudget: null, actualBidAmount: null },
    ],
    {},
    "2026-08-10",
  );
  assert.equal(data.coverage.total, 2);
  assert.equal(data.coverage.withBudget, 1);
  assert.equal(data.coverage.withActualBidAmount, 1);
  assert.equal(data.kpis.allocatedBudget, 0);
});

test("counts due-soon risks before the priority-project limit is applied", () => {
  const delayedRows = Array.from({ length: 10 }, (_, index) => ({
    ...baseRow,
    projectId: `delayed-${index}`,
    targetCompletionDate: new Date("2026-08-01T00:00:00+08:00"),
  }));
  const dueSoon = {
    ...baseRow,
    projectId: "due-soon-outside-top-ten",
    physicalProgress: 10,
    targetCompletionDate: new Date("2026-08-20T00:00:00+08:00"),
  };
  const data = aggregateManagerialDashboardRows(
    [...delayedRows, dueSoon],
    {},
    "2026-08-10",
  );
  assert.equal(data.priorityProjects.length, 10);
  assert.ok(data.insights.some((insight) => /1 priority project is due within 30 days/.test(insight.detail)));
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

test("computes a daily average-progress trend from grouped snapshot rows", () => {
  const trend = aggregatePortfolioTrendRows([
    { date: "2026-08-01", averageProgress: 20, sampleSize: 9, total: 10 },
    { date: "2026-08-08", averageProgress: 30, sampleSize: 9, total: 10 },
    { date: "2026-08-15", averageProgress: 40, sampleSize: 10, total: 10 },
    { date: "2026-08-22", averageProgress: 50, sampleSize: 10, total: 10 },
  ]);
  assert.equal(trend.status, "ready");
  assert.equal(trend.sampleCount, 4);
  assert.equal(trend.spanDays, 21);
  assert.equal(trend.maxGapDays, 7);
  assert.deepEqual(trend.points.map((point) => point.averageProgress), [20, 30, 40, 50]);
  assert.deepEqual(trend.points[0], { date: "2026-08-01", averageProgress: 20, sampleSize: 9, total: 10 });
});

test("reports insufficient history below the minimum sample count or span", () => {
  const tooFewSamples = aggregatePortfolioTrendRows([
    { date: "2026-08-01", averageProgress: 10, sampleSize: 5, total: 5 },
    { date: "2026-08-20", averageProgress: 20, sampleSize: 5, total: 5 },
  ]);
  assert.equal(tooFewSamples.status, "insufficientHistory");

  const tooShortSpan = aggregatePortfolioTrendRows([
    { date: "2026-08-01", averageProgress: 10, sampleSize: 5, total: 5 },
    { date: "2026-08-02", averageProgress: 10, sampleSize: 5, total: 5 },
    { date: "2026-08-03", averageProgress: 10, sampleSize: 5, total: 5 },
  ]);
  assert.equal(tooShortSpan.status, "insufficientHistory");
});

test("drops an old isolated point across a wide gap instead of averaging it into a smooth trend", () => {
  const trend = aggregatePortfolioTrendRows([
    { date: "2026-08-01", averageProgress: 10, sampleSize: 5, total: 5 },
    { date: "2026-09-18", averageProgress: 20, sampleSize: 5, total: 5 },
    { date: "2026-09-19", averageProgress: 21, sampleSize: 5, total: 5 },
  ]);
  // Aug 1 is more than TREND_MAX_GAP_DAYS from Sep 18, so only the Sep 18-19 run counts:
  // still insufficient on its own (2 samples), but for the right, current reason, not
  // because a months-old data point is artificially poisoning the whole-history gap check.
  assert.equal(trend.sampleCount, 2);
  assert.deepEqual(trend.points.map((point) => point.date), ["2026-09-18", "2026-09-19"]);
  assert.equal(trend.status, "insufficientHistory");
});

test("becomes ready from a recent unbroken run even while an old disconnected point is still in the queried window", () => {
  const recentRun = Array.from({ length: 15 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    averageProgress: 50 + index,
    sampleSize: 5,
    total: 5,
  }));
  const trend = aggregatePortfolioTrendRows([
    { date: "2026-07-01", averageProgress: 10, sampleSize: 5, total: 5 },
    ...recentRun,
  ]);
  assert.equal(trend.sampleCount, 15);
  assert.equal(trend.points[0]?.date, "2026-09-01");
  assert.equal(trend.status, "ready");
});

test("portfolio trend query is grouped by capture date, scoped like every other portfolio read", () => {
  const compiled = buildPortfolioTrendQuery(
    { region: "Region VIII", program: "AMEFIP" },
    { role: "moderator", region: "08", assignedAgency: "AMEFIP" },
    "2026-08-10",
  ).toSQL();
  assert.match(compiled.sql, /group by/i);
  assert.match(compiled.sql, /inner join "projects"/i);
  assert.match(compiled.sql, /count\(\*\)/i);
  // Filters apply to the as-captured snapshot columns, not the project's current values.
  assert.match(compiled.sql, /"project_metric_snapshots"\."region"/i);
  assert.match(compiled.sql, /"project_metric_snapshots"\."program"/i);
});

test("portfolio trend query is bounded to a recent lookback window, so one old isolated snapshot can't block the trend forever", () => {
  const compiled = buildPortfolioTrendQuery({}, { role: "admin" }, "2026-08-10").toSQL();
  assert.match(compiled.sql, /"project_metric_snapshots"\."capture_date" >=/i);
  const cutoffParam = compiled.params.find((param) => typeof param === "string" && /^\d{4}-\d{2}-\d{2}$/.test(param));
  assert.equal(cutoffParam, "2026-06-11");
});

test("groups projects by funding year and computes a completion rate", () => {
  const data = aggregateManagerialDashboardRows(
    [
      { ...baseRow, projectId: "old-1", yearFunded: "2019", status: "ongoing", targetCompletionDate: "2020-01-01" },
      { ...baseRow, projectId: "old-2", yearFunded: "2019", status: "completed", actualCompletionDate: "2019-12-01" },
      { ...baseRow, projectId: "new-1", yearFunded: "2026", status: "ongoing" },
    ],
    {},
    "2026-08-10",
  );
  const year2019 = data.fundingYears.find((item) => item.yearFunded === "2019");
  assert.equal(year2019?.total, 2);
  assert.equal(year2019?.completed, 1);
  assert.equal(year2019?.completionRate, 50);
  assert.deepEqual(data.fundingYears.map((item) => item.yearFunded), ["2019", "2026"]);
});

test("counts confirmed bid-over-budget projects and sums only the positive overrun", () => {
  const data = aggregateManagerialDashboardRows(
    [
      { ...baseRow, projectId: "over-1", allocatedBudget: "100000", actualBidAmount: 150000 },
      { ...baseRow, projectId: "over-2", allocatedBudget: "200000", actualBidAmount: 220000 },
      { ...baseRow, projectId: "under", allocatedBudget: "500000", actualBidAmount: 400000 },
      { ...baseRow, projectId: "missing-bid", allocatedBudget: "100000", actualBidAmount: null },
      { ...baseRow, projectId: "missing-budget", allocatedBudget: null, actualBidAmount: 100000 },
    ],
    {},
    "2026-08-10",
  );
  assert.equal(data.kpis.bidExceedsBudgetCount, 2);
  assert.equal(data.kpis.bidOverrunTotal, 70_000);
});
