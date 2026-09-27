import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlannedVsActual,
  cleanBudget,
  cleanContractor,
  cleanDate,
  cleanStartAndFinish,
  getFacilityCategory,
  getPublicStage,
  isValidMapLocation,
  normalizeBannerProgram,
  normalizeProjectType,
  orderPublicPhotos,
  publicBeneficiary,
  repairPlaceName,
} from "./rules";

test("rule 1: public stage mapping excludes proposals", () => {
  assert.equal(getPublicStage("for review", "Procurement"), "bidding");
  assert.equal(getPublicStage("ongoing", "Proposal"), "construction");
  assert.equal(getPublicStage("Under-Construction", null), "construction");
  assert.equal(getPublicStage("implementation-ready", "Implementation"), "construction");
  assert.equal(getPublicStage("suspended", "Implementation"), "on_hold");
  assert.equal(getPublicStage("For Turn-Over", "Implementation"), "turnover");
  assert.equal(getPublicStage("completed", "Implementation"), "handed_over");
  for (const [status, stage] of [
    ["for review", "Proposal"],
    ["incomplete documents", "Pre-implementation"],
    ["planned", "0"],
    ["proposal validated", null],
    ["not feasible", "Proposal"],
    ["re-focussed", null],
    [null, null],
  ] as const) {
    assert.equal(getPublicStage(status, stage), null, `${status}/${stage}`);
  }
});

test("rule 2: implausible budgets are treated as missing", () => {
  assert.equal(cleanBudget("1500000", 1_400_000), 1_500_000);
  assert.equal(cleanBudget(null, null), null);
  assert.equal(cleanBudget("0", null), null);
  assert.equal(cleanBudget(-5, null), null);
  assert.equal(cleanBudget(1_000_000_000, null), null);
  assert.equal(cleanBudget(25_000_000, 1_000_000), null);
  assert.equal(cleanBudget(19_000_000, 1_000_000), 19_000_000);
  assert.equal(cleanBudget(19_000_000, 0), 19_000_000);
});

test("rule 3: implausible dates and reversed start/finish become unknown", () => {
  const now = new Date("2026-09-27T00:00:00Z");
  assert.equal(cleanDate("1970-01-01", now), null);
  assert.equal(cleanDate("0022-05-01", now), null);
  assert.equal(cleanDate("2028-01-01", now), null);
  assert.equal(cleanDate("2027-12-31", now)?.getUTCFullYear(), 2027);
  assert.equal(cleanDate(new Date("2023-04-05T00:00:00Z"), now)?.getUTCFullYear(), 2023);
  assert.deepEqual(cleanStartAndFinish("2024-06-01", "2024-01-01", now), { start: null, finish: null });
  assert.equal(cleanStartAndFinish("2024-01-01", "2024-06-01", now).finish?.getUTCMonth(), 5);
});

test("rule 4: only Philippine coordinates are mappable", () => {
  assert.equal(isValidMapLocation(15.7, 120.9), true);
  assert.equal(isValidMapLocation(0, 0), false);
  assert.equal(isValidMapLocation(1000, 1000), false);
  assert.equal(isValidMapLocation(120.9, 15.7), false);
  assert.equal(isValidMapLocation(null, 120), false);
});

test("rule 5: duplicate project types merge", () => {
  assert.equal(normalizeProjectType("  Rainshelter "), "Rain Shelter");
  assert.equal(normalizeProjectType("NURSERY ESTABLISHMENT"), "Crops Nursery");
  assert.equal(normalizeProjectType("Feed Mill Facility"), "Feed Mill Center");
  assert.equal(normalizeProjectType("Indoor cultivation system"), "Indoor Cultivation System");
  assert.equal(normalizeProjectType("Greenhouse"), "Greenhouse");
});

test("rule 6: facility category uses the first matching pattern", () => {
  assert.equal(getFacilityCategory("Solar-Powered Irrigation System"), "irrigation");
  assert.equal(getFacilityCategory("Rain Shelter"), "production");
  assert.equal(getFacilityCategory("Layer Housing for Layer Production"), "livestock");
  assert.equal(getFacilityCategory("Multi-Purpose Drying Pavement"), "drying");
  assert.equal(getFacilityCategory("Cold Storage"), "storage");
  // "water" appears before "storage" in the rules, so a water storage tank is irrigation.
  assert.equal(getFacilityCategory("Water Storage Tank"), "irrigation");
  assert.equal(getFacilityCategory("Feed Mill Center"), "processing");
  assert.equal(getFacilityCategory("Foodscape"), "foodscape");
  assert.equal(getFacilityCategory("Farm Service Center"), "offices");
  assert.equal(getFacilityCategory("Trading Post"), "other");
});

test("rule 7: banner program names merge", () => {
  assert.equal(normalizeBannerProgram("Not Applicable"), "Other programs");
  assert.equal(normalizeBannerProgram("Not applicable"), "Other programs");
  assert.equal(normalizeBannerProgram(null), "Other programs");
  assert.equal(normalizeBannerProgram("Special Agricultural Area for Development"), "Special Agricultural Area for Development (SAAD)");
});

test("rule 8: question marks become ñ", () => {
  assert.equal(repairPlaceName("Mu?oz"), "Muñoz");
  assert.equal(repairPlaceName("Santo Ni?o"), "Santo Niño");
  assert.equal(repairPlaceName("PE?ABLANCA"), "PEÑABLANCA");
  assert.equal(repairPlaceName("Para?aque"), "Parañaque");
  assert.equal(repairPlaceName("  "), null);
});

test("rule 10: photos are ordered, de-duplicated, and uncategorized is a fallback", () => {
  const photos = orderPublicPhotos([
    { url: "https://x/1.jpg", category: "Validation Photos" },
    { url: "https://x/2.jpg", category: "Completed Photos" },
    { url: "https://x/2.jpg", category: "Progress Photos" },
    { url: "https://x/3.jpg", category: "Progress Photos" },
    { url: "https://x/4.jpg", category: "Uncategorized Photos" },
    { url: "javascript:alert(1)", category: "Completed Photos" },
  ]);
  assert.deepEqual(photos.map((photo) => photo.url), ["https://x/2.jpg", "https://x/3.jpg", "https://x/1.jpg"]);
  assert.deepEqual(orderPublicPhotos([{ url: "https://x/4.jpg", category: "Uncategorized Photos" }]).map((photo) => photo.url), ["https://x/4.jpg"]);
});

test("rule 11 and privacy: placeholder contractors and individual beneficiaries are hidden", () => {
  assert.equal(cleanContractor("Write here (Cell C4)..."), null);
  assert.equal(cleanContractor("N/A"), null);
  assert.equal(cleanContractor("Not applicable"), null);
  assert.equal(cleanContractor("ABC Builders"), "ABC Builders");
  assert.equal(publicBeneficiary("Juan Dela Cruz", "Individual"), "Individual farmer");
  assert.equal(publicBeneficiary("Samahang Magsasaka", "Farmers Cooperative and Associations"), "Samahang Magsasaka");
});

test("planned vs actual is drawn only when targets add up to about 100", () => {
  const rows = [
    { date: "2025-01-31", target: 40, actual: 30, remark: "Original POW" },
    { date: "2025-02-28", target: 60, actual: 50, remark: "Original POW" },
    { date: "2025-02-28", target: 90, actual: 0, remark: "Revised POW" },
  ];
  assert.deepEqual(buildPlannedVsActual(rows), [
    { date: "2025-01-31", target: 40, actual: 30 },
    { date: "2025-02-28", target: 100, actual: 80 },
  ]);
  assert.equal(buildPlannedVsActual([{ date: "2025-01-31", target: 50, actual: 10, remark: "Original POW" }]), null);
  assert.equal(buildPlannedVsActual(null), null);
});
