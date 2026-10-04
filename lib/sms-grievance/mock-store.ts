import { LOCAL_SIMULATED_ID_PREFIX } from "@/lib/sms-grievance/simulate-incoming";
import type { SmsMockScenario } from "@/types/sms-grievance.types";

// Bump this suffix whenever fixture content changes meaningfully (wording, masking
// format, new fields) so browsers with an older cached prototype state fall back to the
// fresh fixtures automatically instead of showing stale sample text indefinitely.
export const SMS_PROTOTYPE_STORAGE_KEY = "infrawatch:sms-grievance-prototype:v9";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Validates that cached browser state genuinely originated from the records the page
// most recently rendered — tied to those records' known ids (not a fixed "[SAMPLE" text
// prefix, since sample message text is now realistic-sounding rather than literally
// bracketed, and live-fetched records carry a real contactNumber rather than a masked
// literal).
function isControlledSampleRecord(value: unknown, knownIds: ReadonlySet<string>): value is SmsMockScenario {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SmsMockScenario>;
  const isControlledSample = record.prototype === true
    && typeof record.id === "string"
    && knownIds.has(record.id)
    && typeof record.originalText === "string"
    && record.originalText.trim().length > 0
    && typeof record.contactNumber === "string"
    && record.contactNumber.trim().length > 0
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

// A record staff added at runtime via "Simulate incoming message" — never part of the
// server-provided fallback, so it's checked on its own terms (id prefix + localSimulated
// flag) instead of against the known-ids set.
function isSimulatedIncomingRecord(value: unknown): value is SmsMockScenario {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SmsMockScenario>;
  return record.prototype === true
    && record.localSimulated === true
    && typeof record.id === "string"
    && record.id.startsWith(LOCAL_SIMULATED_ID_PREFIX)
    && typeof record.originalText === "string"
    && record.originalText.trim().length > 0
    && typeof record.contactNumber === "string"
    && record.contactNumber.trim().length > 0
    && Array.isArray(record.conversation);
}

export function readSmsPrototypeRecords(storage: StorageLike, fallback: SmsMockScenario[]) {
  try {
    const raw = storage.getItem(SMS_PROTOTYPE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;

    const knownIds = new Set(fallback.map((item) => item.id));
    const isRecordObject = (item: unknown): item is Partial<SmsMockScenario> => typeof item === "object" && item !== null;
    const knownPart = parsed.filter((item) => isRecordObject(item) && knownIds.has(item.id as string));
    const simulatedPart = parsed.filter((item) => isRecordObject(item) && !knownIds.has(item.id as string));

    // Every saved record that still matches a known id must itself be a valid controlled
    // sample/live record, but the saved snapshot no longer has to cover every id the live
    // feed currently returns — the live feed grows on its own (new real SMS arrive between
    // visits), and that shouldn't wipe a staff member's in-progress review of older
    // messages or their staff-simulated test message.
    if (!knownPart.every((item) => isControlledSampleRecord(item, knownIds))) return fallback;
    if (!simulatedPart.every(isSimulatedIncomingRecord)) return fallback;

    // Source coordinates are read-only and may be absent from older cached reviews.
    // Refresh them without losing the staff member's local review decisions. Any id in
    // `fallback` with no saved counterpart (a message that arrived since the last save)
    // passes through untouched, still awaiting its first review.
    const savedById = new Map(knownPart.map((item) => [(item as SmsMockScenario).id, item as SmsMockScenario]));
    const mergedKnown = fallback.map((source) => {
      const saved = savedById.get(source.id);
      if (!saved) return source;
      const review = { ...saved };
      delete review.coordinates;
      return source.coordinates === undefined ? review : { ...review, coordinates: source.coordinates };
    });

    return [...simulatedPart, ...mergedKnown] as SmsMockScenario[];
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
