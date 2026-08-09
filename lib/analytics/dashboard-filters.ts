import { z } from "zod";

import {
  PROJECT_STATUS_FILTER_VALUES,
  SCHEDULE_HEALTH_VALUES,
  type ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

const MAX_FILTER_LENGTH = 100;
const MIN_FUNDING_YEAR = 1900;
const MAX_FUNDING_YEAR = 2200;
export const UNKNOWN_FILTER_VALUE = "Unknown";

const optionalText = z.preprocess(
  normalizeOptionalValue,
  z.string().max(MAX_FILTER_LENGTH).optional(),
);

const optionalYear = z.preprocess(
  normalizeOptionalValue,
  z.union([
    z.literal(UNKNOWN_FILTER_VALUE),
    z
      .string()
      .regex(/^\d{4}$/, "year must be a four-digit value")
      .refine((value) => {
        const year = Number(value);
        return year >= MIN_FUNDING_YEAR && year <= MAX_FUNDING_YEAR;
      }, "year is outside the supported range"),
  ]).optional(),
);

const optionalStatus = z.preprocess(
  normalizeOptionalValue,
  z.enum(PROJECT_STATUS_FILTER_VALUES).optional(),
);

const optionalHealth = z.preprocess(
  normalizeOptionalValue,
  z.enum(SCHEDULE_HEALTH_VALUES).optional(),
);

export const managerialDashboardFilterSchema = z.object({
  program: optionalText,
  year: optionalYear,
  region: optionalText,
  province: optionalText,
  projectType: optionalText,
  status: optionalStatus,
  health: optionalHealth,
});

function normalizeOptionalValue(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return undefined;
  return trimmed;
}

export function parseManagerialDashboardFilters(
  searchParams: URLSearchParams,
): ManagerialDashboardFilters {
  const parsed = managerialDashboardFilterSchema.parse({
    program: searchParams.get("program") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    province: searchParams.get("province") ?? undefined,
    projectType: searchParams.get("projectType") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    health: searchParams.get("health") ?? undefined,
  });
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as ManagerialDashboardFilters;
}

export function tryParseManagerialDashboardFilters(
  searchParams: URLSearchParams,
): ManagerialDashboardFilters | null {
  try {
    return parseManagerialDashboardFilters(searchParams);
  } catch {
    return null;
  }
}

export function serializeManagerialDashboardFilters(
  filters: ManagerialDashboardFilters,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  const keys: Array<keyof ManagerialDashboardFilters> = [
    "program",
    "year",
    "region",
    "province",
    "projectType",
    "status",
    "health",
  ];
  for (const key of keys) {
    const value = filters[key];
    if (value) searchParams.set(key, value);
  }
  return searchParams;
}
