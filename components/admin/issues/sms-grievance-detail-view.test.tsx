import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";

import { SmsGrievanceDetailView } from "./sms-grievance-detail-view";

function renderDetail(id: string) {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <SmsGrievanceDetailView id={id} initialRecords={SMS_MOCK_SCENARIOS} />
    </QueryClientProvider>,
  );
}

test("SMS grievance detail page uses clear staff-facing language and keeps the prototype warning", () => {
  const needsReview = SMS_MOCK_SCENARIOS.find((item) => item.status === "needs_relevance_review" && item.relevance === "uncertain")!;
  const accepted = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "confirmed_in_scope")!;

  const html = renderDetail(needsReview.id);
  const acceptedHtml = renderDetail(accepted.id);

  assert.match(html, /SMS Grievance prototype/);
  assert.match(html, /No SMS service is connected/);
  assert.match(html, /Back to sample messages/);
  assert.match(html, /Message exactly as received/);
  assert.match(html, /\*\*\* \*\*\* \*\*\*\*/);
  assert.match(html, /Tag this grievance to a project/);
  // The tagging wizard opens on its first question only — later steps (project search,
  // category, the final button) are reached by advancing, not shown all at once.
  assert.match(html, /Is this about a BAFE project\?/);
  assert.match(html, /This is about a BAFE project/);
  assert.match(html, /Not a BAFE project/);
  assert.match(html, /Link as possible copy/);
  assert.doesNotMatch(html, /Search actual BAFE projects/);
  assert.doesNotMatch(html, /Tag project and create sample case/);
  assert.doesNotMatch(html, />Create sample case</);
  assert.doesNotMatch(html, /No confirmed project yet/);
  assert.doesNotMatch(html, /Save tags and create sample case/);
  assert.doesNotMatch(html, /Simulate SMS response/);
  assert.match(acceptedHtml, /Case follow-up/);
  assert.match(acceptedHtml, /Simulate SMS response/);
  assert.match(acceptedHtml, /No message was sent/);
  assert.doesNotMatch(acceptedHtml, />Send SMS</);
  assert.doesNotMatch(html, /lifecycle/i);
  assert.doesNotMatch(html, /immutable prototype evidence/i);
});

test("an unknown sample id shows a not-available state instead of crashing", () => {
  const html = renderDetail("sample-sms-does-not-exist");
  assert.match(html, /not available/i);
  assert.match(html, /Back to sample messages/);
});
