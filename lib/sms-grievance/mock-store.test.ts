import assert from "node:assert/strict";
import { test } from "bun:test";

import { SMS_MOCK_SCENARIOS } from "./mock-fixtures";
import { readSmsPrototypeRecords, writeSmsPrototypeRecords } from "./mock-store";

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
    status: "pending_review" as const,
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
