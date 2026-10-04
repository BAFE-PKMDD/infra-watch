import type { SmsCoordinates, SmsMockScenario } from "@/types/sms-grievance.types";

export function isValidSmsCoordinates(value: unknown): value is SmsCoordinates {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<SmsCoordinates>;
  return typeof point.lat === "number" && Number.isFinite(point.lat)
    && point.lat >= -90 && point.lat <= 90
    && typeof point.lng === "number" && Number.isFinite(point.lng)
    && point.lng >= -180 && point.lng <= 180;
}

export function parseSmsCoordinates(value: unknown): SmsCoordinates | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const point = { lat: Number(match[1]), lng: Number(match[2]) };
  return isValidSmsCoordinates(point) ? point : null;
}

export type LocatedSmsRecord = SmsMockScenario & { coordinates: SmsCoordinates };

export function getLocatedSmsRecords(records: SmsMockScenario[]): LocatedSmsRecord[] {
  return records.filter((record): record is LocatedSmsRecord => isValidSmsCoordinates(record.coordinates));
}
