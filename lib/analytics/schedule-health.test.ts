import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateExpectedProgress,
  classifyScheduleHealth,
} from "./schedule-health";

const asOf = "2026-08-10";
const activeProject = {
  status: "ongoing",
  startDate: "2026-07-01",
  targetCompletionDate: "2026-09-08",
  actualCompletionDate: null,
  physicalProgress: 50,
};

test("classifies an incomplete project past its target as delayed", () => {
  const result = classifyScheduleHealth(
    { ...activeProject, targetCompletionDate: "2026-08-09" },
    asOf,
  );
  assert.equal(result.health, "delayed");
  assert.equal(result.reasonCode, "pastTarget");
});

test("reports completed-late history without marking an active delay", () => {
  const result = classifyScheduleHealth(
    {
      ...activeProject,
      status: "completed",
      targetCompletionDate: "2026-08-01",
      actualCompletionDate: "2026-08-05",
      physicalProgress: 100,
    },
    asOf,
  );
  assert.equal(result.health, "notAssessed");
  assert.equal(result.completedLate, true);
  assert.equal(result.reasonCode, "completedLate");
});

test("classifies a 15-point schedule deficit as at risk", () => {
  const expected = calculateExpectedProgress("2026-07-01", "2026-09-08", asOf);
  assert.ok(expected !== null);
  const result = classifyScheduleHealth(
    { ...activeProject, physicalProgress: expected - 15 },
    asOf,
  );
  assert.equal(result.health, "atRisk");
  assert.equal(result.reasonCode, "scheduleDeficit");
});

test("classifies a project due within 30 days below 80 percent as at risk", () => {
  const result = classifyScheduleHealth(
    {
      ...activeProject,
      startDate: "2026-01-01",
      targetCompletionDate: "2026-08-30",
      physicalProgress: 79,
    },
    asOf,
  );
  assert.equal(result.health, "atRisk");
  assert.equal(result.reasonCode, "dueSoonLowProgress");
});

test("classifies a small schedule deficit as on track", () => {
  const expected = calculateExpectedProgress("2026-07-01", "2026-10-31", asOf);
  assert.ok(expected !== null);
  const result = classifyScheduleHealth(
    {
      ...activeProject,
      targetCompletionDate: "2026-10-31",
      physicalProgress: expected - 10,
    },
    asOf,
  );
  assert.equal(result.health, "onTrack");
});

test("does not assess a project with a future start", () => {
  const result = classifyScheduleHealth(
    { ...activeProject, startDate: "2026-08-11" },
    asOf,
  );
  assert.equal(result.health, "notAssessed");
  assert.equal(result.reasonCode, "futureStart");
});

test("does not assess missing, invalid, zero-duration, or out-of-range progress inputs", () => {
  const cases = [
    { ...activeProject, startDate: null },
    { ...activeProject, targetCompletionDate: "invalid" },
    { ...activeProject, targetCompletionDate: activeProject.startDate },
    { ...activeProject, targetCompletionDate: "2026-06-30" },
    { ...activeProject, physicalProgress: null },
    { ...activeProject, physicalProgress: 101 },
    { ...activeProject, physicalProgress: -1 },
  ];

  for (const project of cases) {
    assert.equal(classifyScheduleHealth(project, asOf).health, "notAssessed");
  }
});

test("uses Asia/Manila date boundaries for target comparisons", () => {
  const sameManilaDay = classifyScheduleHealth(
    { ...activeProject, targetCompletionDate: "2026-08-09T16:30:00.000Z" },
    asOf,
  );
  const priorManilaDay = classifyScheduleHealth(
    { ...activeProject, targetCompletionDate: "2026-08-09T15:59:00.000Z" },
    asOf,
  );

  assert.notEqual(sameManilaDay.health, "delayed");
  assert.equal(priorManilaDay.health, "delayed");
});
