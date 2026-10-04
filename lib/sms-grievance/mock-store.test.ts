import assert from "node:assert/strict";
import { test } from "bun:test";

import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";
import { readSmsPrototypeRecords, writeSmsPrototypeRecords } from "./mock-store";
import { createSimulatedIncomingMessage } from "./simulate-incoming";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    removeItem: () => { value = null; },
    value: () => value,
  };
}

test("prototype records round-trip through controlled browser storage", () => {
  const storage = memoryStorage();
  const updated = SMS_MOCK_SCENARIOS.map((item) => item.id === "sample-sms-004" ? {
    ...item,
    relevance: "confirmed_in_scope" as const,
    status: "under_review" as const,
    projectMatch: "confirmed" as const,
    projectId: "[SAMPLE BAFE PROJECT ID]",
    projectLabel: "[SAMPLE BAFE PROJECT]",
  } : item);
  writeSmsPrototypeRecords(storage, updated);
  assert.deepEqual(readSmsPrototypeRecords(storage, SMS_MOCK_SCENARIOS), updated);
});

test("invalid or non-sample browser state fails back to deterministic fixtures", () => {
  const invalid = memoryStorage(JSON.stringify([{ id: "external", prototype: false }]));
  assert.deepEqual(readSmsPrototypeRecords(invalid, SMS_MOCK_SCENARIOS), SMS_MOCK_SCENARIOS);

  const malformed = memoryStorage("not-json");
  assert.deepEqual(readSmsPrototypeRecords(malformed, SMS_MOCK_SCENARIOS), SMS_MOCK_SCENARIOS);
});

test("older saved reviews gain current source coordinates without losing review decisions", () => {
  const template = SMS_MOCK_SCENARIOS.find((record) => record.status === "needs_relevance_review")!;
  const saved = { ...template, relevanceReason: "Staff review in progress", locationLabel: "Staff location note" };
  const source = { ...template, coordinates: { lat: 6.99607, lng: 125.0715867 } };
  const [restored] = readSmsPrototypeRecords(memoryStorage(JSON.stringify([saved])), [source]);
  assert.deepEqual(restored.coordinates, source.coordinates);
  assert.equal(restored.relevanceReason, saved.relevanceReason);
  assert.equal(restored.locationLabel, saved.locationLabel);
});

test("saved coordinates cannot override a corrected or removed source location", () => {
  const template = SMS_MOCK_SCENARIOS.find((record) => record.status === "needs_relevance_review")!;
  const storage = memoryStorage(JSON.stringify([{ ...template, coordinates: { lat: 14, lng: 121 } }]));
  assert.equal(readSmsPrototypeRecords(storage, [{ ...template, coordinates: null }])[0].coordinates, null);
  assert.equal(readSmsPrototypeRecords(storage, [template])[0].coordinates, undefined);
});

test("a staff-simulated incoming message round-trips alongside the known controlled set", () => {
  const storage = memoryStorage();
  const simulated = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "Staff test message" }, SMS_MOCK_SCENARIOS);
  const withSimulated = [simulated, ...SMS_MOCK_SCENARIOS];

  writeSmsPrototypeRecords(storage, withSimulated);
  const restored = readSmsPrototypeRecords(storage, SMS_MOCK_SCENARIOS);

  assert.equal(restored.length, SMS_MOCK_SCENARIOS.length + 1);
  assert.ok(restored.some((item) => item.id === simulated.id && item.localSimulated === true));
});

test("a malformed extra record that isn't a genuine simulated message is rejected", () => {
  const storage = memoryStorage(JSON.stringify([{ id: "not-a-real-record", prototype: true }, ...SMS_MOCK_SCENARIOS]));
  assert.deepEqual(readSmsPrototypeRecords(storage, SMS_MOCK_SCENARIOS), SMS_MOCK_SCENARIOS);
});

test("new messages arriving in a growing live feed do not wipe saved review progress or a simulated message", () => {
  const storage = memoryStorage();
  const simulated = createSimulatedIncomingMessage({ contactNumber: "09171234567", originalText: "Staff test message" }, SMS_MOCK_SCENARIOS);
  const reviewedInProgress = SMS_MOCK_SCENARIOS.map((item) => item.id === "sample-sms-004" ? { ...item, relevanceReason: "Staff is halfway through reviewing this one." } : item);
  writeSmsPrototypeRecords(storage, [simulated, ...reviewedInProgress]);

  // Simulates two new real messages showing up in the live feed since the last save.
  const grownFallback = [
    ...SMS_MOCK_SCENARIOS,
    { ...SMS_MOCK_SCENARIOS[0], id: "live-sms-new-1", externalMessageId: "BAFE-SMS-100" },
    { ...SMS_MOCK_SCENARIOS[0], id: "live-sms-new-2", externalMessageId: "BAFE-SMS-101" },
  ];

  const restored = readSmsPrototypeRecords(storage, grownFallback);

  assert.equal(restored.length, grownFallback.length + 1);
  assert.ok(restored.some((item) => item.id === simulated.id));
  assert.ok(restored.some((item) => item.id === "sample-sms-004" && item.relevanceReason === "Staff is halfway through reviewing this one."));
  assert.ok(restored.some((item) => item.id === "live-sms-new-1"));
  assert.ok(restored.some((item) => item.id === "live-sms-new-2"));
});

test("accepted browser state without an actual BAFE project is rejected", () => {
  const validFallback = SMS_MOCK_SCENARIOS.map((item) => item.id === "sample-sms-001"
    ? {
        ...item,
        projectMatch: "confirmed" as const,
        projectId: "[SAMPLE BAFE PROJECT ID]",
        projectLabel: "[SAMPLE BAFE PROJECT]",
      }
    : item);
  const staleRecords = validFallback.map((item) => item.id === "sample-sms-001"
    ? { ...item, projectMatch: "not_identified" as const, projectId: undefined, projectLabel: "Not yet identified" }
    : item);
  const stale = memoryStorage(JSON.stringify(staleRecords));

  assert.deepEqual(readSmsPrototypeRecords(stale, validFallback), validFallback);
});
