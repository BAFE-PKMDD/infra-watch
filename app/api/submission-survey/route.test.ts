import assert from "node:assert/strict";
import { test } from "bun:test";
import { NextRequest } from "next/server";
import { createSubmissionSurveyHandler } from "./route";

test("submission-survey route: rejects non-object or invalid JSON body", async () => {
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async () => ({ id: "mock-id" }),
  });
  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "invalid-json",
  });
  const res = await handler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("submission-survey route: rejects invalid referralSource", async () => {
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async () => ({ id: "mock-id" }),
  });
  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: "feedback",
      referralSource: "tiktok",
    }),
  });
  const res = await handler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("submission-survey route: rejects out-of-range age", async () => {
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async () => ({ id: "mock-id" }),
  });
  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: "e_report",
      age: 150,
      respondentType: "farmer",
      referralSource: "facebook",
    }),
  });
  const res = await handler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("submission-survey route: rejects invalid respondentType", async () => {
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async () => ({ id: "mock-id" }),
  });
  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: "e_report",
      respondentType: "astronaut",
      referralSource: "facebook",
    }),
  });
  const res = await handler(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("submission-survey route: a non-skipped submission requires respondentType and referralSource", async () => {
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async () => ({ id: "mock-id" }),
  });
  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceType: "e_report" }),
  });
  const res = await handler(req);
  assert.equal(res.status, 400);
});

test("submission-survey route: a skipped submission needs no respondentType or referralSource", async () => {
  let captured: any = null;
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async (data) => {
      captured = data;
      return { id: "skip-uuid" };
    },
  });
  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceType: "e_report", skipped: true }),
  });
  const res = await handler(req);
  assert.equal(res.status, 201);
  assert.equal(captured.skipped, true);
  assert.equal(captured.respondentType, null);
  assert.equal(captured.referralSource, null);
});

test("submission-survey route: accepts valid payload with Facebook, Website, and Instagram", async () => {
  const savedData: any[] = [];
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async (data) => {
      savedData.push(data);
      return { id: "test-survey-uuid" };
    },
  });

  for (const source of ["facebook", "website", "instagram"] as const) {
    const req = new NextRequest("http://localhost:3001/api/submission-survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "feedback",
        respondentType: "normal_citizen",
        name: "Citizen Jane",
        age: 29,
        gender: "Female",
        referralSource: source,
      }),
    });
    const res = await handler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, "test-survey-uuid");
  }

  assert.equal(savedData.length, 3);
  assert.equal(savedData[0].referralSource, "facebook");
  assert.equal(savedData[1].referralSource, "website");
  assert.equal(savedData[2].referralSource, "instagram");
});

test("submission-survey route: handles optional name as null when omitted", async () => {
  let captured: any = null;
  const handler = createSubmissionSurveyHandler({
    saveSurvey: async (data) => {
      captured = data;
      return { id: "survey-anon-uuid" };
    },
  });

  const req = new NextRequest("http://localhost:3001/api/submission-survey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceType: "e_report",
      sourceId: "INFRA-2026-123456",
      respondentType: "farmer",
      age: 42,
      gender: "Male",
      referralSource: "website",
    }),
  });
  const res = await handler(req);
  assert.equal(res.status, 201);
  assert.equal(captured.name, null);
  assert.equal(captured.age, 42);
  assert.equal(captured.gender, "Male");
  assert.equal(captured.sourceType, "e_report");
  assert.equal(captured.sourceId, "INFRA-2026-123456");
});
