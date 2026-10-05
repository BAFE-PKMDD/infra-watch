import assert from "node:assert/strict";
import { test } from "bun:test";
import { getReportPreset, parseReportRange, reportDay, reportRangeToCalendar } from "./date-range";

test("includes the entire final Manila day and excludes the next midnight", () => {
  const range = parseReportRange({ from: "2026-10-01", to: "2026-10-05" });
  assert.equal(range.start.toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-10-05T16:00:00.000Z");
  for (const value of ["2026-10-05T12:00:00+08:00", "2026-10-05T23:59:59.999+08:00"]) {
    const date = new Date(value);
    assert.ok(date >= range.start && date < range.endExclusive);
  }
  assert.equal(new Date("2026-10-06T00:00:00+08:00") < range.endExclusive, false);
});

test("uses the Manila day even when UTC is still on the previous date", () => {
  const range = parseReportRange({}, new Date("2026-10-05T16:30:00Z"));
  assert.equal(range.to, "2026-10-06");
  assert.equal(range.from, "2026-09-07");
});

test("presets contain exactly 7, 30, or 90 inclusive calendar days", () => {
  for (const days of [7, 30, 90]) {
    const range = parseReportRange(getReportPreset(days, new Date("2026-10-05T08:00:00Z")));
    assert.equal((range.endExclusive.getTime() - range.start.getTime()) / 86_400_000, days);
  }
});

test("accepts legacy ISO URLs and Date arguments while keeping Manila calendar semantics", () => {
  const range = parseReportRange({ from: "2026-09-30T16:00:00.000Z", to: new Date("2026-10-04T16:00:00.000Z") });
  assert.equal(range.from, "2026-10-01");
  assert.equal(range.to, "2026-10-05");
});

test("rejects invalid and reversed dates and supports a single-day range", () => {
  for (const from of ["bad", "2026-02-30", "2026-13-01"]) {
    assert.throws(() => parseReportRange({ from, to: "2026-10-05" }), /valid calendar dates/);
  }
  assert.throws(() => parseReportRange({ from: "2026-10-06", to: "2026-10-05" }), /before/);
  const day = parseReportRange({ from: "2026-10-05", to: "2026-10-05" });
  assert.equal(day.endExclusive.getTime() - day.start.getTime(), 86_400_000);
});

test("an end-date-only URL defaults to the 30 days ending on that date", () => {
  const range = parseReportRange({ to: "2026-09-15" });
  assert.equal(range.from, "2026-08-17");
  const calendar = reportRangeToCalendar(range);
  assert.equal(calendar.from.getDate(), 17);
  assert.equal(calendar.to.getDate(), 15);
  assert.equal(reportDay(range.start), range.from);
});
