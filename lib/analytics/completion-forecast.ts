export type CompletionForecastSnapshot = {
  captureDate: Date | string;
  physicalProgress: number | null;
};

export type ForecastConfidence = "low" | "medium" | "high";

export type CompletionForecast = {
  status: "insufficientHistory" | "stalled" | "projected" | "completed" | "inactive";
  projectedCompletionDate: string | null;
  velocityPointsPerDay: number | null;
  confidence: ForecastConfidence | null;
  targetRisk: boolean | null;
  evidence: {
    sampleCount: number;
    spanDays: number;
    firstCaptureDate: string | null;
    lastCaptureDate: string | null;
    firstProgress: number | null;
    lastProgress: number | null;
    rSquared: number | null;
  };
};

type ForecastInput = {
  status: string | null;
  targetCompletionDate: Date | string | null;
  snapshots: CompletionForecastSnapshot[];
};

const DAY_MS = 86_400_000;

export function calculateCompletionForecast(input: ForecastInput): CompletionForecast {
  const validSnapshots = input.snapshots
    .filter(
      (snapshot) =>
        Number.isFinite(snapshot.physicalProgress) &&
        Number(snapshot.physicalProgress) >= 0 &&
        Number(snapshot.physicalProgress) <= 100 &&
        !Number.isNaN(new Date(snapshot.captureDate).getTime()),
    )
    .map((snapshot) => ({
      captureDate: new Date(snapshot.captureDate),
      physicalProgress: Number(snapshot.physicalProgress),
    }))
    .sort((a, b) => a.captureDate.getTime() - b.captureDate.getTime());
  const latestByDay = new Map<string, (typeof validSnapshots)[number]>();
  for (const snapshot of validSnapshots) {
    latestByDay.set(snapshot.captureDate.toISOString().slice(0, 10), snapshot);
  }
  const snapshots = [...latestByDay.values()];
  const first = snapshots[0] ?? null;
  const last = snapshots.at(-1) ?? null;
  const spanDays = first && last
    ? Math.round((last.captureDate.getTime() - first.captureDate.getTime()) / DAY_MS)
    : 0;
  const baseEvidence = {
    sampleCount: snapshots.length,
    spanDays,
    firstCaptureDate: first?.captureDate.toISOString() ?? null,
    lastCaptureDate: last?.captureDate.toISOString() ?? null,
    firstProgress: first?.physicalProgress ?? null,
    lastProgress: last?.physicalProgress ?? null,
  };

  const lifecycleStatus = input.status?.trim().toLowerCase();
  if (lifecycleStatus === "completed") {
    return noProjection("completed", baseEvidence, null, null);
  }
  if (lifecycleStatus !== "ongoing") {
    return noProjection("inactive", baseEvidence, null, null);
  }
  if (snapshots.length < 3 || spanDays < 14 || !first || !last) {
    return noProjection("insufficientHistory", baseEvidence, null, null);
  }

  const regression = linearRegression(
    snapshots.map((snapshot) => ({
      x: (snapshot.captureDate.getTime() - first.captureDate.getTime()) / DAY_MS,
      y: snapshot.physicalProgress,
    })),
  );
  const velocity = round(regression.slope, 4);
  const confidence = regression.slope <= 0
    ? "low"
    : forecastConfidence(snapshots.length, spanDays, regression.rSquared);

  if (regression.slope <= 0) {
    return noProjection("stalled", baseEvidence, velocity, confidence, regression.rSquared);
  }

  const remainingDays = Math.max(
    0,
    Math.ceil((100 - last.physicalProgress) / regression.slope - 1e-9),
  );
  const projected = new Date(last.captureDate.getTime() + remainingDays * DAY_MS);
  const projectedCompletionDate = projected.toISOString().slice(0, 10);
  const target = input.targetCompletionDate ? new Date(input.targetCompletionDate) : null;
  const targetRisk = target && !Number.isNaN(target.getTime())
    ? projected.getTime() > target.getTime()
    : null;

  return {
    status: "projected",
    projectedCompletionDate,
    velocityPointsPerDay: velocity,
    confidence,
    targetRisk,
    evidence: { ...baseEvidence, rSquared: round(regression.rSquared, 4) },
  };
}

function noProjection(
  status: "insufficientHistory" | "stalled" | "completed" | "inactive",
  evidence: Omit<CompletionForecast["evidence"], "rSquared">,
  velocityPointsPerDay: number | null,
  confidence: ForecastConfidence | null,
  rSquared: number | null = null,
): CompletionForecast {
  return {
    status,
    projectedCompletionDate: null,
    velocityPointsPerDay,
    confidence,
    targetRisk: null,
    evidence: {
      ...evidence,
      rSquared: rSquared === null ? null : round(rSquared, 4),
    },
  };
}

function linearRegression(points: Array<{ x: number; y: number }>) {
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const covariance = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const varianceX = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const totalVariance = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const residualVariance = points.reduce(
    (sum, point) => sum + (point.y - (meanY + slope * (point.x - meanX))) ** 2,
    0,
  );
  return {
    slope,
    rSquared: totalVariance === 0 ? 1 : Math.max(0, 1 - residualVariance / totalVariance),
  };
}

function forecastConfidence(
  sampleCount: number,
  spanDays: number,
  rSquared: number,
): ForecastConfidence {
  const sampleScore = Math.min(1, (sampleCount - 2) / 4);
  const spanScore = Math.min(1, spanDays / 56);
  const score = rSquared * 0.5 + sampleScore * 0.25 + spanScore * 0.25;
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

function round(value: number, digits: number) {
  return Number(value.toFixed(digits));
}
