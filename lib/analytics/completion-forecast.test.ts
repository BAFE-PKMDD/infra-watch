import assert from "node:assert/strict";
import test from "node:test";

import { calculateCompletionForecast } from "./completion-forecast";

const point = (captureDate: string, physicalProgress: number) => ({
  captureDate,
  physicalProgress,
});

test("returns insufficient history with fewer than three valid points", () => {
  const forecast = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-10-01",
    snapshots: [point("2026-08-01", 20), point("2026-08-20", 40)],
  });

  assert.equal(forecast.status, "insufficientHistory");
  assert.equal(forecast.projectedCompletionDate, null);
  assert.equal(forecast.evidence.sampleCount, 2);
});

test("returns insufficient history when three points span less than fourteen days", () => {
  const forecast = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-10-01",
    snapshots: [
      point("2026-08-01", 20),
      point("2026-08-07", 30),
      point("2026-08-13", 40),
    ],
  });

  assert.equal(forecast.status, "insufficientHistory");
  assert.equal(forecast.evidence.spanDays, 12);
});

test("uses one latest observation per capture day", () => {
  const forecast = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-10-01",
    snapshots: [
      point("2026-08-01", 20),
      point("2026-08-08", 25),
      point("2026-08-08", 30),
      point("2026-08-15", 40),
    ],
  });

  assert.equal(forecast.evidence.sampleCount, 3);
  assert.equal(forecast.status, "projected");
  assert.equal(forecast.evidence.rSquared, 1);
});

test("reports stalled progress without inventing a completion date", () => {
  const forecast = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-10-01",
    snapshots: [
      point("2026-08-01", 40),
      point("2026-08-08", 40),
      point("2026-08-15", 40),
    ],
  });

  assert.equal(forecast.status, "stalled");
  assert.equal(forecast.velocityPointsPerDay, 0);
  assert.equal(forecast.projectedCompletionDate, null);
});

test("projects completion from a stable positive physical-progress velocity", () => {
  const forecast = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-10-01",
    snapshots: [
      point("2026-08-01", 20),
      point("2026-08-08", 30),
      point("2026-08-15", 40),
    ],
  });

  assert.equal(forecast.status, "projected");
  assert.equal(forecast.velocityPointsPerDay, 1.4286);
  assert.equal(forecast.projectedCompletionDate, "2026-09-26");
  assert.equal(forecast.evidence.rSquared, 1);
});

test("marks noisy or declining progress as low confidence", () => {
  const noisy = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-12-01",
    snapshots: [
      point("2026-08-01", 20),
      point("2026-08-08", 70),
      point("2026-08-15", 30),
    ],
  });
  const declining = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-12-01",
    snapshots: [
      point("2026-08-01", 50),
      point("2026-08-08", 45),
      point("2026-08-15", 40),
    ],
  });

  assert.equal(noisy.confidence, "low");
  assert.equal(declining.status, "stalled");
  assert.equal(declining.confidence, "low");
  assert.equal(declining.projectedCompletionDate, null);
});

test("flags target risk when the projected date is after the contractual target", () => {
  const forecast = calculateCompletionForecast({
    status: "ongoing",
    targetCompletionDate: "2026-09-01",
    snapshots: [
      point("2026-08-01", 20),
      point("2026-08-08", 30),
      point("2026-08-15", 40),
    ],
  });

  assert.equal(forecast.projectedCompletionDate, "2026-09-26");
  assert.equal(forecast.targetRisk, true);
});

test("completed projects have no active completion forecast", () => {
  const forecast = calculateCompletionForecast({
    status: "completed",
    targetCompletionDate: "2026-09-01",
    snapshots: [
      point("2026-08-01", 80),
      point("2026-08-08", 90),
      point("2026-08-15", 100),
    ],
  });

  assert.equal(forecast.status, "completed");
  assert.equal(forecast.projectedCompletionDate, null);
  assert.equal(forecast.velocityPointsPerDay, null);
  assert.equal(forecast.targetRisk, null);
});

test("planned, suspended, and cancelled projects have no active forecast", () => {
  for (const status of ["planned", "suspended", "cancelled"]) {
    const forecast = calculateCompletionForecast({
      status,
      targetCompletionDate: "2026-09-01",
      snapshots: [
        point("2026-08-01", 20),
        point("2026-08-08", 30),
        point("2026-08-15", 40),
      ],
    });

    assert.equal(forecast.status, "inactive");
    assert.equal(forecast.projectedCompletionDate, null);
    assert.equal(forecast.velocityPointsPerDay, null);
    assert.equal(forecast.targetRisk, null);
  }
});
