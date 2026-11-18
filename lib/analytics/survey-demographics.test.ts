import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  ageToBandKey,
  buildSurveyDemographics,
  summarizeDistribution,
} from "./survey-demographics";

test("places ages into fixed bands and treats missing or invalid ages as not provided", () => {
  assert.equal(ageToBandKey(null), "not_provided");
  assert.equal(ageToBandKey(0), "not_provided");
  assert.equal(ageToBandKey(17), "under_18");
  assert.equal(ageToBandKey(18), "18_24");
  assert.equal(ageToBandKey(24), "18_24");
  assert.equal(ageToBandKey(25), "25_34");
  assert.equal(ageToBandKey(64), "55_64");
  assert.equal(ageToBandKey(65), "65_plus");
  assert.equal(ageToBandKey(120), "65_plus");
});

test("hides groups under two and says so without revealing how many were hidden", () => {
  const result = summarizeDistribution(
    [
      { key: "farmer", count: 9 },
      { key: "student", count: 2 },
      { key: "raed_staff", count: 1 },
      { key: "other", count: 1 },
    ],
    (key) => key,
  );
  assert.deepEqual(result.rows.map((row) => row.key), ["farmer", "student"]);
  assert.equal(result.hasHiddenGroups, true);
  assert.equal("hiddenResponses" in result, false);
});

test("merges blank answers into Not provided and keeps it last", () => {
  const result = summarizeDistribution(
    [
      { key: null, count: 8 },
      { key: "  ", count: 3 },
      { key: "Female", count: 6 },
      { key: "Male", count: 6 },
    ],
    (key) => key,
  );
  assert.deepEqual(result.rows.map((row) => [row.label, row.count]), [
    ["Female", 6],
    ["Male", 6],
    ["Not provided", 11],
  ]);
  assert.equal(result.hasHiddenGroups, false);
});

test("builds coverage, ordered age bands and labels without exposing individual rows", () => {
  const result = buildSurveyDemographics({
    asked: 40,
    answered: 30,
    respondentTypes: [{ key: "normal_citizen", count: 20 }, { key: "farmer", count: 10 }],
    ages: [
      { age: 30, count: 6 },
      { age: 22, count: 7 },
      { age: 28, count: 5 },
      { age: 70, count: 1 },
      { age: null, count: 10 },
    ],
    genders: [{ key: "Female", count: 18 }, { key: "Prefer not to say", count: 12 }],
    referralSources: [{ key: "facebook", count: 25 }, { key: "website", count: 5 }],
    surveySources: [{ key: "feedback", count: 21 }, { key: "e_report", count: 9 }],
  });

  assert.equal(result.asked, 40);
  assert.equal(result.answered, 30);
  assert.equal(result.skipped, 10);
  assert.equal(result.responseRate, 75);
  assert.deepEqual(result.respondentTypes.rows.map((row) => row.label), ["Normal citizen", "Farmer"]);
  assert.deepEqual(result.ageBands.rows.map((row) => [row.label, row.count]), [
    ["18–24", 7],
    ["25–34", 11],
    ["Not provided", 10],
  ]);
  assert.equal(result.ageBands.hasHiddenGroups, true);
  assert.deepEqual(result.referralSources.rows.map((row) => row.label), ["Facebook", "Website"]);
  assert.deepEqual(result.surveySources.rows.map((row) => row.label), ["Feedback", "E-Report"]);
  assert.equal(JSON.stringify(result).includes("name"), false);
});

test("returns a null response rate when nobody was asked", () => {
  const result = buildSurveyDemographics({
    asked: 0, answered: 0, respondentTypes: [], ages: [], genders: [], referralSources: [], surveySources: [],
  });
  assert.equal(result.responseRate, null);
  assert.equal(result.skipped, 0);
  assert.equal(result.respondentTypes.rows.length, 0);
});
