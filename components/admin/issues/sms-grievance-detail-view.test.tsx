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
  assert.match(html, /09\*{7}89/);

  // The 3-stage lifecycle is always visible, so a first-time reviewer can see the whole
  // process (received -> review & tag -> respond) at a glance.
  assert.match(html, /Received/);
  assert.match(html, /Review &amp; tag/);
  assert.match(html, /Respond &amp; resolve/);

  // The tagging wizard opens on its first question only — later steps (project search,
  // category, the final button) are reached by advancing, not shown all at once.
  assert.match(html, /Is this about a BAFE project\?/);
  assert.match(html, /This is about a BAFE project/);
  assert.match(html, /Not a BAFE project/);
  assert.match(html, /Not sure — possibly a BAFE project/);
  assert.doesNotMatch(html, /Link as possible copy/);
  assert.doesNotMatch(html, /Search actual BAFE projects/);
  assert.doesNotMatch(html, /Tag project and create sample case/);
  assert.doesNotMatch(html, />Create sample case</);
  assert.doesNotMatch(html, /No confirmed project yet/);
  assert.doesNotMatch(html, /Save tags and create sample case/);
  assert.doesNotMatch(html, /Send reply/);
  assert.doesNotMatch(html, /lifecycle/i);
  assert.doesNotMatch(html, /immutable prototype evidence/i);
});

test("an accepted case not yet routed to a team or region hides reply, notes, and the status dropdown", () => {
  const accepted = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "confirmed_in_scope" && !item.assignedUnit && !item.assignedRegion)!;
  const html = renderDetail(accepted.id);

  assert.match(html, /Confirmed as a BAFE project/);
  assert.match(html, new RegExp(accepted.projectLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // Reply, internal notes, and the status dropdown all depend on the case
  // actually being routed — only "Assign & route" is available until then.
  assert.match(html, /Assign &amp; route/);
  assert.match(html, /unlock once this case is linked/);
  assert.doesNotMatch(html, /Send reply/);
  assert.doesNotMatch(html, /Internal note/);
  assert.doesNotMatch(html, /Grievance status/);
  assert.doesNotMatch(html, /Restrict access/);
  assert.doesNotMatch(html, />Send SMS</);
  // The decision is already made, so the wizard's first question shouldn't reappear.
  assert.doesNotMatch(html, /Is this about a BAFE project\?/);
});

test("a case already routed to a team and region unlocks reply, internal notes, and the grievance status dropdown", () => {
  const base = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "confirmed_in_scope")!;
  const linked = { ...base, assignedUnit: "[SAMPLE REVIEW TEAM]", assignedRegion: "[SAMPLE REGION]" };
  const queryClient = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <SmsGrievanceDetailView id={linked.id} initialRecords={[linked]} />
    </QueryClientProvider>,
  );

  assert.match(html, /Send reply/);
  assert.match(html, /Assign &amp; route/);
  assert.match(html, /Internal note/);
  assert.match(html, /Grievance status/);
  assert.doesNotMatch(html, /Restrict access/);
  assert.doesNotMatch(html, />Send SMS</);
});

test("a message closed as not-a-BAFE-project or a duplicate shows a closed state instead of the 4-stage flow", () => {
  const notBafe = SMS_MOCK_SCENARIOS.find((item) => item.relevance === "out_of_scope")!;
  const html = renderDetail(notBafe.id);

  assert.match(html, /Closed — marked as not a BAFE project/);
  assert.doesNotMatch(html, /Is this about a BAFE project\?/);
  assert.doesNotMatch(html, /Send reply/);
});

test("an unknown sample id shows a not-available state instead of crashing", () => {
  const html = renderDetail("sample-sms-does-not-exist");
  assert.match(html, /not available/i);
  assert.match(html, /Back to sample messages/);
});
