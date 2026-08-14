import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectPassport } from "./project-passport";
import type { ProjectDetail } from "@/types";

const project: ProjectDetail = {
  id: "AMEFIP-1",
  name: "Solar-powered irrigation system",
  code: "AMEFIP-1",
  location: "San Jose, Nueva Ecija",
  implementingAgency: "DA-BAFE",
  budget: 4_000_000,
  abc: 3_750_000,
  startDate: "Jan 1, 2026",
  duration: "120 days",
  status: "ongoing",
  stage: "Implementation",
  yearFunded: "2026",
  completionDate: "Apr 30, 2026",
  contractor: "Example supplier",
  scope: "Irrigation",
  projectLength: "Unavailable",
  description: "Source-backed project record",
  updates: [],
  sourceAgency: "ABEMIS",
  sourceSystem: "ABEMIS infrastructure project feed",
  lastSyncedAt: "Aug 10, 2026, 10:15 PM",
  coordinateStatus: "verified",
  dataCoverage: { available: 8, total: 10 },
};

test("explains project provenance, financial semantics, and coordinate evidence", () => {
  const html = renderToStaticMarkup(createElement(ProjectPassport, { project }));
  assert.match(html, /Project Passport/);
  assert.match(html, /ABEMIS infrastructure project feed/);
  assert.match(html, /Last successful sync/);
  assert.match(html, /Approved budget/);
  assert.match(html, /Supplier actual bid/);
  assert.match(html, /Verified source coordinates/);
  assert.match(html, /8 of 10 core fields available/);
});

test("links a citizen report to the current project and never invents missing values", () => {
  const html = renderToStaticMarkup(createElement(ProjectPassport, {
    project: {
      ...project,
      budget: null,
      abc: undefined,
      coordinateStatus: "unavailable",
    },
  }));
  assert.match(html, /\/report-issue\/new\?projectId=AMEFIP-1/);
  assert.match(html, /Approved budget[\s\S]*Unavailable/);
  assert.match(html, /Coordinates unavailable/);
  assert.doesNotMatch(html, /₱0\.00/);
});
