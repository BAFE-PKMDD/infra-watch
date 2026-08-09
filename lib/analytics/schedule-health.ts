import { mapInternalToPublicStage } from "@/constants/stage-mapping";
import type { ScheduleHealth } from "@/types/managerial-dashboard.types";

export const SCHEDULE_HEALTH_THRESHOLDS = {
  scheduleDeficitPoints: 15,
  dueSoonDays: 30,
  dueSoonProgressPercent: 80,
} as const;

export type ScheduleHealthReason =
  | "pastTarget"
  | "completedLate"
  | "completedOnTime"
  | "scheduleDeficit"
  | "dueSoonLowProgress"
  | "withinSchedule"
  | "futureStart"
  | "missingSchedule"
  | "invalidSchedule"
  | "missingProgress"
  | "invalidProgress"
  | "inactive";

export type ScheduleProjectInput = {
  status: string | null;
  startDate: string | Date | null;
  targetCompletionDate: string | Date | null;
  actualCompletionDate?: string | Date | null;
  physicalProgress: number | null;
};

export type ScheduleHealthResult = {
  health: ScheduleHealth;
  expectedProgress: number | null;
  variance: number | null;
  daysToTarget: number | null;
  completedLate: boolean;
  reasonCode: ScheduleHealthReason;
};

const MANILA_TIMEZONE = "Asia/Manila";
const DAY_MS = 86_400_000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateKeyInManila(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) {
    return isValidDateKey(value) ? value : null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function isValidDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function differenceInCalendarDays(later: string, earlier: string) {
  return dayNumber(later) - dayNumber(earlier);
}

export function calculateExpectedProgress(
  startDate: string | Date | null,
  targetCompletionDate: string | Date | null,
  asOf: string | Date,
): number | null {
  const start = dateKeyInManila(startDate);
  const target = dateKeyInManila(targetCompletionDate);
  const current = dateKeyInManila(asOf);
  if (!start || !target || !current) return null;

  const duration = differenceInCalendarDays(target, start);
  const elapsed = differenceInCalendarDays(current, start);
  if (duration <= 0 || elapsed < 0) return null;
  return Math.max(0, Math.min(100, (elapsed / duration) * 100));
}

export function classifyScheduleHealth(
  project: ScheduleProjectInput,
  asOf: string | Date,
  thresholds = SCHEDULE_HEALTH_THRESHOLDS,
): ScheduleHealthResult {
  const current = dateKeyInManila(asOf);
  const start = dateKeyInManila(project.startDate);
  const target = dateKeyInManila(project.targetCompletionDate);
  const actual = dateKeyInManila(project.actualCompletionDate);
  const publicStage = mapInternalToPublicStage(project.status);
  const completed = publicStage === "Completed";

  if (completed) {
    const completedLate = Boolean(actual && target && actual > target);
    return notAssessed(completedLate ? "completedLate" : "completedOnTime", completedLate);
  }

  if (!start || !target || !current) return notAssessed("missingSchedule");
  const duration = differenceInCalendarDays(target, start);
  if (duration <= 0) return notAssessed("invalidSchedule");
  if (current < start) return notAssessed("futureStart");

  if (target < current) {
    return {
      health: "delayed",
      expectedProgress: calculateExpectedProgress(start, target, current),
      variance: null,
      daysToTarget: differenceInCalendarDays(target, current),
      completedLate: false,
      reasonCode: "pastTarget",
    };
  }

  if (project.status?.trim().toLowerCase() === "suspended" || publicStage !== "On going") {
    return notAssessed("inactive");
  }
  if (project.physicalProgress === null) return notAssessed("missingProgress");
  if (
    !Number.isFinite(project.physicalProgress) ||
    project.physicalProgress < 0 ||
    project.physicalProgress > 100
  ) {
    return notAssessed("invalidProgress");
  }

  const expectedProgress = calculateExpectedProgress(start, target, current);
  if (expectedProgress === null) return notAssessed("invalidSchedule");
  const variance = project.physicalProgress - expectedProgress;
  const daysToTarget = differenceInCalendarDays(target, current);

  if (-variance >= thresholds.scheduleDeficitPoints) {
    return {
      health: "atRisk",
      expectedProgress,
      variance,
      daysToTarget,
      completedLate: false,
      reasonCode: "scheduleDeficit",
    };
  }

  if (
    daysToTarget >= 0 &&
    daysToTarget <= thresholds.dueSoonDays &&
    project.physicalProgress < thresholds.dueSoonProgressPercent
  ) {
    return {
      health: "atRisk",
      expectedProgress,
      variance,
      daysToTarget,
      completedLate: false,
      reasonCode: "dueSoonLowProgress",
    };
  }

  return {
    health: "onTrack",
    expectedProgress,
    variance,
    daysToTarget,
    completedLate: false,
    reasonCode: "withinSchedule",
  };
}

function notAssessed(
  reasonCode: ScheduleHealthReason,
  completedLate = false,
): ScheduleHealthResult {
  return {
    health: "notAssessed",
    expectedProgress: null,
    variance: null,
    daysToTarget: null,
    completedLate,
    reasonCode,
  };
}
