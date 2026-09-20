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

test("a message still needing review shows the 4-stage lifecycle with steps 2-3 active", () => {
  const needsReview = SMS_MOCK_SCENARIOS.find((item) => item.status === "needs_relevance_review" && item.relevance === "uncertain")!;
  const html = renderDetail(needsReview.id);

  assert.match(html, /SMS Grievance prototype/);
  assert.match(html, /No SMS service is connected/);
  assert.match(html, /Back to sample messages/);
  assert.match(html, /Message exactly as received/);
  assert.match(html, /\*\*\* \*\*\* \*\*\*\*/);

  // The 4-stage lifecycle is always visible, so a first-time reviewer can see the whole
  // process (received -> check relevance -> identify project -> respond) at a glance.
  assert.match(html, /Received/);
  assert.match(html, /Check relevance/);
  assert.match(html, /Identify project/);
  assert.match(html, /Respond &amp; resolve/);

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
  assert.doesNotMatch(html, /lifecycle/i);
  assert.doesNotMatch(html, /immutable prototype evidence/i);
});

test("an accepted case shows a plain-language summary of steps 1-3 and puts step 4 front and center", () => {
  const accepted = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "confirmed_in_scope")!;
  const html = renderDetail(accepted.id);

  assert.match(html, /Confirmed as a BAFE project/);
  assert.match(html, new RegExp(accepted.projectLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /Reply to sender \(simulation\)/);
  assert.match(html, /Simulate SMS response/);
  assert.match(html, /No message was sent/);
  assert.match(html, /More options: routing, internal notes, restricted access/);
  assert.doesNotMatch(html, />Send SMS</);
  // The decision is already made, so the wizard's first question shouldn't reappear.
  assert.doesNotMatch(html, /Is this about a BAFE project\?/);
});

test("a message closed as not-a-BAFE-project or a duplicate shows a closed state instead of the 4-stage flow", () => {
  const notBafe = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "out_of_scope")!;
  const html = renderDetail(notBafe.id);

  assert.match(html, /Closed — marked as not a BAFE project/);
  assert.doesNotMatch(html, /Is this about a BAFE project\?/);
  assert.doesNotMatch(html, /Reply to sender \(simulation\)/);
});

test("an unknown sample id shows a not-available state instead of crashing", () => {
  const html = renderDetail("sample-sms-does-not-exist");
  assert.match(html, /not available/i);
  assert.match(html, /Back to sample messages/);
});
