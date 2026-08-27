import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExecutiveInsights, applyInsightFilter, formatAttentionStatement } from "./executive-insights";
import { PriorityProjectsTable, sortPriorityProjects } from "./priority-projects-table";

test("renders at most three actionable insights and applies a trusted filter", () => {
  const insights = Array.from({ length: 4 }, (_, index) => ({
    severity: index === 0 ? "critical" as const : "warning" as const,
    title: `Insight ${index + 1}`,
    detail: `Detail ${index + 1}`,
    filter: index === 0 ? { health: "delayed" as const } : undefined,
  }));
  const html = renderToStaticMarkup(createElement(ExecutiveInsights, { insights, onApplyFilter: () => undefined }));
  assert.match(html, /Needs Attention/);
  assert.match(html, /Detail 1/);
  assert.match(html, /Detail 3/);
  assert.doesNotMatch(html, /Detail 4/);
  assert.equal((html.match(/data-attention-item=/g) ?? []).length, 3);
  assert.match(html, /View affected projects/);
  assert.doesNotMatch(html, /Deterministic insights from approved metrics/);

  let selected: unknown;
  applyInsightFilter((filter) => { selected = filter; }, { health: "delayed" });
  assert.deepEqual(selected, { health: "delayed" });
});

test("formats direct, data-derived attention statements without generic headings", () => {
  assert.equal(formatAttentionStatement({
    severity: "critical",
    title: "Budget exposure needs attention",
    detail: "₱2,221,322,441 is allocated to delayed or at-risk projects.",
  }), "₱2.22B is tied to delayed or at-risk projects.");
  assert.equal(formatAttentionStatement({
    severity: "warning",
    title: "Schedule-data coverage is limited",
    detail: "19.35% of projects have assessable schedule dates.",
  }), "Only 19% of projects have schedule data.");
  assert.equal(formatAttentionStatement({
    severity: "warning",
    title: "Bicol Region has the highest delayed-project rate",
    detail: "58 of 60 assessed projects are delayed.",
  }), "58 projects are delayed in Bicol Region.");

  const html = renderToStaticMarkup(createElement(ExecutiveInsights, {
    insights: [
      { severity: "critical", title: "Budget exposure needs attention", detail: "₱2,221,322,441 is allocated to delayed or at-risk projects." },
      { severity: "warning", title: "Schedule-data coverage is limited", detail: "19.35% of projects have assessable schedule dates.", filter: { health: "notAssessed" as const } },
    ],
    onApplyFilter: () => undefined,
  }));
  assert.match(html, /₱2\.22B is tied to delayed or at-risk projects/);
  assert.match(html, /Only 19% of projects have schedule data/);
  assert.doesNotMatch(html, /Budget exposure needs attention|Schedule-data coverage is limited/);
});

test("renders a keyboard-usable priority table with reason and canonical project links", () => {
  const html = renderToStaticMarkup(createElement(PriorityProjectsTable, {
    projects: [{
      projectId: "ABEMIS 123",
      projectName: "Farm-to-market road",
      program: "AMEFIP",
      region: "Region VIII",
      province: "Leyte",
      projectType: "Road",
      allocatedBudget: 10_000_000,
      physicalProgress: 42,
      targetCompletionDate: "2026-08-01T00:00:00.000Z",
      daysToTarget: -9,
      scheduleVariance: -24,
      health: "delayed",
      reason: "9 days overdue",
      forecast: {
        status: "projected",
        projectedCompletionDate: "2026-10-15",
        confidence: "high",
        targetRisk: true,
      },
    }],
  }));
  assert.match(html, /Priority Projects/);
  assert.match(html, /9 days overdue/);
  assert.match(html, /₱|PHP/);
  assert.match(html, /42%/);
  assert.match(html, /Projected completion/i);
  assert.match(html, /Oct 15, 2026/);
  assert.match(html, /high confidence/i);
  assert.match(html, /href="\/projects\/ABEMIS%20123"/);
  assert.doesNotMatch(html, /reporter|contact|email/i);
});

test("priority table has a truthful empty state", () => {
  assert.match(
    renderToStaticMarkup(createElement(PriorityProjectsTable, { projects: [] })),
    /No delayed or at-risk projects/,
  );
});

test("priority table shows five urgent projects by default and links to the full project list", () => {
  const projects = Array.from({ length: 7 }, (_, index) => ({
    projectId: `P-${index + 1}`,
    projectName: `Priority project ${index + 1}`,
    program: "AMEFIP",
    region: index % 2 === 0 ? "Bicol Region (Region V)" : "Region VIII",
    province: null,
    projectType: "Irrigation",
    allocatedBudget: (index + 1) * 1_000_000,
    physicalProgress: index === 6 ? null : index * 10,
    targetCompletionDate: `2026-0${Math.min(index + 1, 9)}-01T00:00:00.000Z`,
    daysToTarget: -(index + 1),
    scheduleVariance: null,
    health: "delayed" as const,
    reason: `${index + 1} days overdue`,
  }));
  const html = renderToStaticMarkup(createElement(PriorityProjectsTable, { projects }));

  assert.equal((html.match(/data-priority-project-row=/g) ?? []).length, 5);
  assert.match(html, /View all projects/);
  assert.match(html, /href="\/admin-projects"/);
  assert.match(html, /Unknown/);
});

test("priority projects can be sorted by delay, budget, region, and completion", () => {
  const rows = [
    { projectId: "a", projectName: "A", program: "P", region: "Z", province: null, projectType: "Road", allocatedBudget: 1, physicalProgress: null, targetCompletionDate: null, daysToTarget: -2, scheduleVariance: null, health: "delayed" as const, reason: "2 days overdue" },
    { projectId: "b", projectName: "B", program: "P", region: "A", province: null, projectType: "Road", allocatedBudget: 2, physicalProgress: 0, targetCompletionDate: null, daysToTarget: -10, scheduleVariance: null, health: "delayed" as const, reason: "10 days overdue" },
  ];

  assert.equal(sortPriorityProjects(rows, "delay")[0]?.projectId, "b");
  assert.equal(sortPriorityProjects(rows, "budget")[0]?.projectId, "b");
  assert.equal(sortPriorityProjects(rows, "region")[0]?.projectId, "b");
  assert.equal(sortPriorityProjects(rows, "completion")[0]?.projectId, "b");
});
