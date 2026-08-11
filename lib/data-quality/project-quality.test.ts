import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission, statement } from "@/lib/permissions";
import {
  analyzeProjectDataQuality,
  buildProjectGeometry,
  isStaleSourceRecord,
} from "./project-quality";

test("uses allocated budget and supplier bid semantics for financial issues", () => {
  const issues = analyzeProjectDataQuality({
    id: "project-1",
    abemisId: "AMEFIP-1",
    projectCode: "AMEFIP-1",
    name: "Irrigation project",
    status: "ongoing",
    budget: "1000000.00",
    abc: 1100000,
    region: "Region III",
    province: "Pampanga",
    municipality: "San Fernando",
    barangay: null,
    latitude: 15.03,
    longitude: 120.68,
    lastSyncedAt: new Date("2026-08-11T00:00:00Z"),
  });

  assert.deepEqual(
    issues.map((issue) => ({ type: issue.type, field: issue.field, currentValue: issue.currentValue })),
    [
      {
        type: "bid_exceeds_approved_budget",
        field: "abc",
        currentValue: 1100000,
      },
    ],
  );
  assert.match(issues[0]?.message ?? "", /actual bid amount/i);
  assert.match(issues[0]?.message ?? "", /approved budget/i);
});

test("reports missing financial and location evidence without proposing destructive cleanup", () => {
  const issues = analyzeProjectDataQuality({
    id: "project-2",
    abemisId: "AMEFIP-2",
    projectCode: null,
    name: "Unassessable project",
    status: "planned",
    budget: null,
    abc: null,
    region: null,
    province: null,
    municipality: null,
    barangay: null,
    latitude: 15,
    longitude: null,
    lastSyncedAt: new Date("2026-08-01T00:00:00Z"),
  });

  assert.deepEqual(
    issues.map((issue) => issue.type),
    ["missing_approved_budget", "missing_actual_bid_amount", "missing_location", "invalid_coordinates"],
  );
  assert.equal(issues.find((issue) => issue.type === "invalid_coordinates")?.field, "longitude");
  assert.equal(issues.some((issue) => "proposedValue" in issue), false);
  assert.equal(issues.every((issue) => typeof issue.recommendation === "string" && issue.recommendation.length > 0), true);
  assert.equal(issues.some((issue) => /automatically (?:change|clean|delete|archive)/i.test(issue.recommendation)), false);
});

test("exposes Data Quality as a view-only permission", () => {
  assert.deepEqual(statement.data_quality, ["view"]);
  assert.equal(hasPermission("admin", "data_quality", "view"), true);
  assert.equal(hasPermission("moderator", "data_quality", "view"), true);
  assert.equal(hasPermission("citizen", "data_quality", "view"), false);
});

test("marks cleanup candidates only against a later successful synchronization", () => {
  const lastSeen = new Date("2026-08-10T00:00:00Z");
  assert.equal(isStaleSourceRecord(lastSeen, null), false);
  assert.equal(isStaleSourceRecord(lastSeen, new Date("2026-08-09T00:00:00Z")), false);
  assert.equal(isStaleSourceRecord(lastSeen, new Date("2026-08-11T00:00:00Z")), true);
});

test("keeps PostGIS geometry aligned with corrected latitude and longitude", () => {
  assert.equal(buildProjectGeometry(15.25, 120.5), "SRID=4326;POINT(120.5 15.25)");
  assert.equal(buildProjectGeometry(15.25, null), null);
});
