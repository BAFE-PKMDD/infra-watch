import assert from "node:assert/strict";
import test from "node:test";

import { FARM_OPERATIONS } from "./project-type-map";
import {
  ISSUE_TYPES,
  formatIssueTypeValue,
  getCategoryDisplayName,
  parseIssueTypeValue,
  splitIssueTypes,
  splitIssueTypesByFarmOperation,
} from "./issue-type-map";

test("every farmOperations tag on an issue type is a real Farm Operation category", () => {
  const validOperations = new Set(FARM_OPERATIONS);
  for (const type of ISSUE_TYPES) {
    for (const operation of type.farmOperations) {
      assert.ok(
        validOperations.has(operation),
        `"${operation}" tagged on issue type "${type.id}" is not a known Farm Operation`,
      );
    }
  }
});

test("issue type ids and labels are unique", () => {
  const ids = ISSUE_TYPES.map((type) => type.id);
  const labels = ISSUE_TYPES.map((type) => type.label);
  assert.equal(new Set(ids).size, ids.length, "duplicate issue type id");
  assert.equal(new Set(labels).size, labels.length, "duplicate issue type label");
});

test("common issue types (no farmOperations tag) appear in every recommended split", () => {
  const commonLabels = ISSUE_TYPES.filter((type) => type.farmOperations.length === 0).map((type) => type.label);

  for (const operation of [...FARM_OPERATIONS, ""]) {
    const { recommended } = splitIssueTypesByFarmOperation(operation);
    const recommendedLabels = recommended.map((type) => type.label);
    for (const label of commonLabels) {
      assert.ok(recommendedLabels.includes(label), `"${label}" missing from recommended set for "${operation}"`);
    }
  }
});

test("recommended and more are disjoint and together cover every issue type", () => {
  for (const operation of [...FARM_OPERATIONS, "", "Not A Real Operation"]) {
    const { recommended, more } = splitIssueTypesByFarmOperation(operation);
    assert.equal(recommended.length + more.length, ISSUE_TYPES.length);
    const recommendedIds = new Set(recommended.map((type) => type.id));
    for (const type of more) {
      assert.ok(!recommendedIds.has(type.id));
    }
  }
});

test("Irrigation System recommends canal and pump issue types, not road-specific ones", () => {
  const { recommended } = splitIssueTypesByFarmOperation("Irrigation System");
  const recommendedIds = recommended.map((type) => type.id);
  assert.ok(recommendedIds.includes("irrigation_leak"));
  assert.ok(recommendedIds.includes("irrigation_gate_valve"));
  assert.ok(!recommendedIds.includes("road_pavement"));
});

test("Agricultural Transport and Infrastructure recommends pavement and signage issue types", () => {
  const { recommended } = splitIssueTypesByFarmOperation("Agricultural Transport and Infrastructure");
  const recommendedIds = recommended.map((type) => type.id);
  assert.ok(recommendedIds.includes("road_pavement"));
  assert.ok(recommendedIds.includes("road_signage"));
  assert.ok(!recommendedIds.includes("irrigation_leak"));
});

test("an unrecognized or blank farm operation falls back to only the common issue types", () => {
  const { recommended: forBlank } = splitIssueTypesByFarmOperation("");
  const { recommended: forUnknown } = splitIssueTypesByFarmOperation("Not A Real Operation");
  const commonCount = ISSUE_TYPES.filter((type) => type.farmOperations.length === 0).length;
  assert.equal(forBlank.length, commonCount);
  assert.equal(forUnknown.length, commonCount);
});

test("formatIssueTypeValue and parseIssueTypeValue round-trip multiple selections", () => {
  const selections = ["Safety Hazard", "Pavement Damage or Potholes", "Idle / Not Operational"];
  const stored = formatIssueTypeValue(selections);
  assert.deepEqual(parseIssueTypeValue(stored), selections);
});

test("the stored value separator never collides with a comma already inside a label", () => {
  const labelWithComma = ISSUE_TYPES.find((type) => type.label.includes(","));
  assert.ok(labelWithComma, "test assumes at least one label contains a comma");

  const stored = formatIssueTypeValue(["Safety Hazard", labelWithComma!.label]);
  assert.deepEqual(parseIssueTypeValue(stored), ["Safety Hazard", labelWithComma!.label]);
});

test("parseIssueTypeValue ignores blank input and stray whitespace", () => {
  assert.deepEqual(parseIssueTypeValue(""), []);
  assert.deepEqual(parseIssueTypeValue("  Safety Hazard  |  Other  "), ["Safety Hazard", "Other"]);
});

test("splitIssueTypes by category correctly recommends category-relevant types", () => {
  const qualitySplit = splitIssueTypes({ category: "quality" });
  const qualityRecommendedIds = qualitySplit.recommended.map((t) => t.id);
  assert.ok(qualityRecommendedIds.includes("substandard_materials"));
  assert.ok(qualityRecommendedIds.includes("poor_workmanship"));
  assert.ok(!qualityRecommendedIds.includes("slow_pacing"));
  assert.ok(qualitySplit.more.some((t) => t.id === "slow_pacing"));

  const progressSplit = splitIssueTypes({ category: "progress" });
  const progressRecommendedIds = progressSplit.recommended.map((t) => t.id);
  assert.ok(progressRecommendedIds.includes("construction_delay"));
  assert.ok(progressRecommendedIds.includes("slow_pacing"));
  assert.ok(!progressRecommendedIds.includes("substandard_materials"));
  assert.ok(progressSplit.more.some((t) => t.id === "substandard_materials"));

  const generalSplit = splitIssueTypes({ category: "general" });
  const generalRecommendedIds = generalSplit.recommended.map((t) => t.id);
  assert.ok(generalRecommendedIds.includes("community_suggestion"));
  assert.ok(generalRecommendedIds.includes("general_inquiry"));

  const concernsSplit = splitIssueTypes({ category: "concerns" });
  const concernsRecommendedIds = concernsSplit.recommended.map((t) => t.id);
  assert.ok(concernsRecommendedIds.includes("safety_hazard"));
  assert.ok(concernsRecommendedIds.includes("vandalism_theft"));
});

test("splitIssueTypes combines category and farmOperation recommendations", () => {
  const roadQuality = splitIssueTypes({
    category: "quality",
    farmOperation: "Agricultural Transport and Infrastructure",
  });
  const roadQualityIds = roadQuality.recommended.map((t) => t.id);
  assert.ok(roadQualityIds.includes("road_pavement"));
  assert.ok(roadQualityIds.includes("substandard_materials"));
  assert.ok(!roadQualityIds.includes("irrigation_leak"));
  // Irrigation leak is still in 'more' so citizens can browse all issue types
  assert.ok(roadQuality.more.some((t) => t.id === "irrigation_leak"));
});

test("getCategoryDisplayName returns human-readable label", () => {
  assert.equal(getCategoryDisplayName("quality"), "Project Quality");
  assert.equal(getCategoryDisplayName("progress"), "Project Progress");
  assert.equal(getCategoryDisplayName("general"), "General Feedback");
  assert.equal(getCategoryDisplayName("concerns"), "Concerns & Issues");
  assert.equal(getCategoryDisplayName(null), "");
});
