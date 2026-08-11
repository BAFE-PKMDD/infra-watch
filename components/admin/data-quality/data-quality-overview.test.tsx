import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DataQualityOverview } from "./data-quality-overview";
import type { DataQualityReport } from "@/types/data-quality.types";

const report = {
  summary: {
    totalProjectsScanned: 100,
    projectsWithFindings: 8,
    totalIssues: 12,
    critical: 4,
    warning: 3,
    info: 5,
    cleanupCandidateCount: 1,
    latestSuccessfulSyncStartedAt: "2026-08-11T00:00:00.000Z",
    issueCounts: {
      missing_approved_budget: 2,
      missing_actual_bid_amount: 2,
      bid_exceeds_approved_budget: 1,
      missing_location: 1,
      invalid_coordinates: 1,
      duplicate_project_code: 1,
      stale_source_record: 1,

    },
  },
  issues: [
    {
      project: {
        id: "uuid-1",
        abemisId: "AMEFIP-1",
        projectCode: "CODE-1",
        name: "Sample project",
        status: "ongoing",
        budget: null,
        abc: 900000,
        region: "Region III",
        province: "Pampanga",
        municipality: "San Fernando",
        barangay: null,
        latitude: 15,
        longitude: 120,
        lastSyncedAt: "2026-08-10T00:00:00.000Z",
      },
      findings: [
        {
          type: "missing_approved_budget" as const,
          severity: "critical" as const,
          field: "budget",
          currentValue: null,
          message: "The approved budget is missing.",
          recommendation: "Verify the approved budget against the authoritative allocation document.",
        },
        {
          type: "missing_location" as const,
          severity: "warning" as const,
          field: "location",
          currentValue: null,
          message: "The project location is incomplete.",
          recommendation: "Verify the location against authoritative project records.",
        },
      ],
    },
  ],
  pagination: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
  cleanupExecutionEnabled: false as const,
};

test("explains financial semantics and keeps cleanup preview-only", () => {
  const html = renderToStaticMarkup(
    <DataQualityOverview report={report} />,
  );

  assert.match(html, /Approved budget/);
  assert.match(html, /Supplier actual bid amount/);
  assert.match(html, /Projects with findings/);
  assert.match(html, /Total findings/);
  assert.match(html, /one project can have multiple findings/i);
  assert.match(html, /Preview only/);
  assert.match(html, /recommendation only/i);
  assert.doesNotMatch(html, />Correct</);
  assert.doesNotMatch(html, />Clean</);
  assert.doesNotMatch(html, />Apply</);
  assert.doesNotMatch(html, />Archive</);
  assert.doesNotMatch(html, />Delete</);
  assert.match(html, /Verify the approved budget against the authoritative allocation document/);
  assert.match(html, /Verify the location against authoritative project records/);
  assert.equal((html.match(/\/projects\/AMEFIP-1/g) ?? []).length, 1);
});

test("is read-only without mutation callbacks", () => {
  const html = renderToStaticMarkup(
    <DataQualityOverview report={report} />,
  );
  assert.doesNotMatch(html, />Correct</);
  assert.match(html, /View only/);
});

test("does not crash while a stale cached report is missing a newly added summary field", () => {
  const legacySummary = { ...report.summary } as Partial<typeof report.summary>;
  delete legacySummary.projectsWithFindings;
  const legacyReport = { ...report, summary: legacySummary } as unknown as DataQualityReport;

  const html = renderToStaticMarkup(<DataQualityOverview report={legacyReport} />);

  assert.match(html, /Projects with findings/);
  assert.match(html, /Unavailable/);
});
