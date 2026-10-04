import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

import { SmsProjectTaggingWizard, stepsForDecision } from "./sms-project-tagging-wizard";

function noop() {}

function renderWizard(props: React.ComponentProps<typeof SmsProjectTaggingWizard>) {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <SmsProjectTaggingWizard {...props} />
    </QueryClientProvider>,
  );
}

test("each intake decision has its own step sequence, always starting with the decision and ending with review", () => {
  assert.deepEqual(stepsForDecision("bafe_project"), ["decision", "region", "project", "category", "reason", "review"]);
  assert.deepEqual(stepsForDecision("possible_bafe_project"), ["decision", "region", "project", "category", "reason", "review"]);
  assert.deepEqual(stepsForDecision("not_bafe_project"), ["decision", "reason", "review"]);
});

test("the wizard opens on the decision step, one question at a time, not the whole form at once", () => {
  const html = renderWizard({
    intakeDecision: "bafe_project",
    onIntakeDecisionChange: noop,
    category: "other",
    onCategoryChange: noop,
    locationTag: "",
    onLocationTagChange: noop,
    selectedProject: null,
    onSelectedProjectChange: noop,
    decisionReason: "",
    onDecisionReasonChange: noop,
    notBafeCategory: "not_related_to_infrawatch",
    onNotBafeCategoryChange: noop,
    assignedRegion: "",
    onAssignedRegionChange: noop,
    intakeButtonLabel: "Tag project and create sample case",
    onSaveIntakeDecision: noop,
  });

  assert.match(html, /Is this about a BAFE project\?/);
  assert.match(html, /This is about a BAFE project/);
  assert.match(html, /Not a BAFE project/);
  assert.match(html, /Not sure — possibly a BAFE project/);
  assert.doesNotMatch(html, /Link as possible copy/);
  assert.match(html, /Step 1 of 6/);
  // Later steps aren't shown until the staff member advances past the decision.
  assert.doesNotMatch(html, /Search actual BAFE projects/);
  assert.doesNotMatch(html, /Concern category/);
  assert.doesNotMatch(html, /Tag project and create sample case/);
});
