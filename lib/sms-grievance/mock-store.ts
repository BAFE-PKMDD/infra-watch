import type { SmsMockScenario } from "@/types/sms-grievance.types";

// Bump this suffix whenever fixture content changes meaningfully (wording, masking
// format, new fields) so browsers with an older cached prototype state fall back to the
// fresh fixtures automatically instead of showing stale sample text indefinitely.
export const SMS_PROTOTYPE_STORAGE_KEY = "infrawatch:sms-grievance-prototype:v4";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Validates that cached browser state genuinely originated from this app's own sample
// set — tied to the current fixtures' known ids/text (not a fixed "[SAMPLE" text prefix,
// since sample message text is now realistic-sounding rather than literally bracketed).
function isControlledSampleRecord(value: unknown, knownIds: ReadonlySet<string>): value is SmsMockScenario {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SmsMockScenario>;
  const isControlledSample = record.prototype === true
    && typeof record.id === "string"
    && knownIds.has(record.id)
    && typeof record.originalText === "string"
    && record.originalText.trim().length > 0
    && record.maskedContact === "09*******89"
    && Array.isArray(record.conversation);

  if (!isControlledSample) return false;
  if (record.relevance === "confirmed_in_scope") {
    return record.projectMatch === "confirmed"
      && typeof record.projectId === "string"
      && record.projectId.trim().length > 0
      && typeof record.projectLabel === "string"
      && record.projectLabel.trim().length > 0;
  }
  if (record.projectMatch === "not_bafe_project") return record.relevance === "out_of_scope";
  return true;
}

export function readSmsPrototypeRecords(storage: StorageLike, fallback: SmsMockScenario[]) {
  try {
    const raw = storage.getItem(SMS_PROTOTYPE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    const knownIds = new Set(fallback.map((item) => item.id));
    if (!Array.isArray(parsed) || parsed.length !== fallback.length || !parsed.every((item) => isControlledSampleRecord(item, knownIds))) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeSmsPrototypeRecords(storage: StorageLike, records: SmsMockScenario[]) {
  if (process.env.NODE_ENV === "production") return;
  storage.setItem(SMS_PROTOTYPE_STORAGE_KEY, JSON.stringify(records));
}

export function clearSmsPrototypeRecords(storage: StorageLike) {
  storage.removeItem(SMS_PROTOTYPE_STORAGE_KEY);
}
