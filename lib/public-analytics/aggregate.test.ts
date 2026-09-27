import assert from "node:assert/strict";
import test from "node:test";

import {
  applyFilters,
  byArea,
  byCategory,
  byProgram,
  byStage,
  byYear,
  finishedPerYear,
  listProjects,
  mapPoints,
  parseFilters,
  searchPlaces,
  summarize,
  toCsv,
  type PublicProject,
} from "./aggregate";

const base: PublicProject = {
  id: "p1",
  code: "ABM-1",
  name: "Greenhouse A",
  stage: "handed_over",
  category: "production",
  projectType: "Greenhouse",
  program: "High Value Crops Development Program",
  region: "Region III",
  province: "Nueva Ecija",
  municipality: "Muñoz",
  barangay: "Bantug",
  year: 2023,
  budget: 1_000_000,
  latitude: 15.7,
  longitude: 120.9,
  recipientType: "Farmers Cooperative and Associations",
  farmerGroupKey: "samahang a",
  commodities: ["Rice", "Vegetables"],
  finishedYear: 2024,
};

const rows: PublicProject[] = [
  base,
  { ...base, id: "p2", code: "ABM-2", name: "Drying Pavement B", stage: "construction", category: "drying", projectType: "Multi-Purpose Drying Pavement", budget: null, latitude: null, longitude: null, finishedYear: null, farmerGroupKey: "samahang a" },
  { ...base, id: "p3", code: "ABM-3", name: "=HYPERLINK(\"x\")", stage: "bidding", region: "Region I", province: "Pangasinan", municipality: "Alaminos", year: 2024, budget: 2_500_000, farmerGroupKey: "samahang b", finishedYear: null },
  { ...base, id: "p4", code: "ABM-4", name: "Warehouse", stage: "turnover", category: "storage", projectType: "Warehouse", program: "Other programs", year: 2022, budget: 500_000, recipientType: "LGU", farmerGroupKey: null, finishedYear: 2023 },
];

test("summary counts projects, usable budgets, finished facilities, farmer groups and provinces", () => {
  const summary = summarize(rows);
  assert.equal(summary.projects, 4);
  assert.equal(summary.investment, 4_000_000);
  assert.equal(summary.projectsWithBudget, 3);
  assert.equal(summary.finished, 2);
  assert.equal(summary.farmerGroups, 2);
  assert.equal(summary.provinces, 2);
});

test("every view adds up to the same totals as the summary", () => {
  const summary = summarize(rows);
  const sumProjects = (list: Array<{ projects: number }>) => list.reduce((total, row) => total + row.projects, 0);
  const sumPesos = (list: Array<{ pesos: number }>) => list.reduce((total, row) => total + row.pesos, 0);
  const now = new Date("2026-06-01");
  assert.equal(sumProjects(byArea(rows, {}).rows), summary.projects);
  assert.equal(sumPesos(byArea(rows, {}).rows), summary.investment);
  assert.equal(sumProjects(byYear(rows, now, 2021)), summary.projects);
  assert.equal(sumPesos(byYear(rows, now, 2021)), summary.investment);
  assert.equal(sumProjects(byCategory(rows)), summary.projects);
  assert.equal(sumProjects(byProgram(rows)), summary.projects);
  assert.equal(sumProjects(byStage(rows)), summary.projects);
  assert.equal(listProjects(rows, {}).total, summary.projects);
  assert.equal(mapPoints(rows).length, 3);
  assert.equal(sumProjects(finishedPerYear(rows, now, 2021)), 2);
});

test("area chart drills down to the next level below the location filter", () => {
  assert.equal(byArea(rows, {}).level, "region");
  assert.equal(byArea(rows, { region: "Region III" }).level, "province");
  assert.deepEqual(byArea(applyFilters(rows, { province: "Nueva Ecija" }), { province: "Nueva Ecija" }).rows.map((row) => row.label), ["Muñoz"]);
});

test("filters are parsed defensively", () => {
  const filters = parseFilters(new URLSearchParams("region=Region%20III&year=abc&category=unknown"));
  assert.deepEqual(filters, { region: "Region III", province: null, municipality: null, year: null, category: null });
  assert.equal(applyFilters(rows, { year: 2024 }).length, 1);
  assert.equal(applyFilters(rows, { category: "storage" }).length, 1);
});

test("program chart keeps the top programs and folds the rest into Other programs", () => {
  const many = Array.from({ length: 12 }, (_, index) => ({ ...base, id: `m${index}`, program: `Program ${index}` }));
  const result = byProgram(many, 8);
  assert.equal(result.length, 9);
  assert.equal(result[8].label, "Other programs");
  assert.equal(result[8].projects, 4);
});

test("project list searches, sorts with missing values last, and pages", () => {
  const byBudget = listProjects(rows, { sort: "budget", direction: "desc" });
  assert.deepEqual(byBudget.rows.map((row) => row.id), ["p3", "p1", "p4", "p2"]);
  assert.equal(listProjects(rows, { query: "muñoz" }).total, 3);
  const paged = listProjects(rows, { pageSize: 1, page: 9 });
  assert.equal(paged.page, 4);
  assert.equal(paged.rows.length, 1);
});

test("place search returns mapped places centred on their projects", () => {
  const places = searchPlaces(rows, "muñ");
  assert.equal(places[0].label, "Muñoz, Nueva Ecija");
  assert.equal(places[0].projects, 3);
  assert.equal(places[0].lat, 15.7);
});

test("CSV export uses public fields only and neutralises formulas", () => {
  const csv = toCsv(rows, (stage) => stage);
  const header = csv.split("\r\n")[0];
  assert.match(header, /Project ID,Name,Facility type/);
  assert.doesNotMatch(csv, /samahang/i);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
});
