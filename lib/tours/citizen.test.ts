import assert from "node:assert/strict";
import { test } from "bun:test";
import { CITIZEN_GUIDES, CITIZEN_OVERVIEW_ID, CITIZEN_PROJECT_ID, citizenGuideAllowsPath, citizenGuideSteps, citizenStepCanAdvance, citizenStepToRevisit, citizenOverview, simulateCitizenSubmission } from "./citizen";
import { applyTourUpdate, EMPTY_TOUR_PROGRESS, tourKey, tourUpdateSchema } from "./progress";

test("citizen overview describes features without launching submissions", () => {
  assert.equal(citizenOverview.id, CITIZEN_OVERVIEW_ID);
  assert.equal(citizenOverview.steps.length, 6);
  assert.ok(citizenOverview.steps.every((step) => !step.target?.includes("submit")));
  assert.equal(CITIZEN_GUIDES.length, 4);
  for (const guide of CITIZEN_GUIDES) assert.ok(tourUpdateSchema.safeParse({ tourId: guide.id, outcome: "completed", disableAutomatic: false }).success);
});

test("feedback guidance includes project navigation, the actual form, review, and simulated completion", () => {
  const steps = citizenGuideSteps("citizen-feedback");
  assert.match(steps[0].target, /data-citizen-nav="\/projects"/);
  assert.match(steps[1].target, /project-view-details/);
  assert.match(steps[2].target, /project-feedback-tab/);
  assert.match(steps[3].target, /share-feedback/);
  assert.match(steps[6].target, /#comment/);
  assert.equal(steps.at(-2)?.advance, "page", "the submit instruction must wait for a result");
  assert.match(steps.at(-1)!.target, /receipt/);
  assert.ok(citizenGuideAllowsPath("citizen-feedback", `/projects/${CITIZEN_PROJECT_ID}`));
  assert.equal(citizenGuideAllowsPath("citizen-feedback", "/projects/real-project"), false);
});

test("write guides are restricted to their own pages and require an example result", () => {
  for (const guide of CITIZEN_GUIDES) {
    assert.ok(citizenGuideAllowsPath(guide.id, guide.path));
    assert.equal(citizenGuideAllowsPath(guide.id, "/dashboard"), false);
    const steps = citizenGuideSteps(guide.id);
    if (guide.id !== "citizen-sms") {
      assert.equal(steps.at(-2)?.advance, "page");
      assert.match(steps.at(-1)!.target, /receipt/);
    }
  }
  assert.match(citizenGuideSteps("citizen-sms")[0].description, /prototype/);
});

test("example submissions validate locally without returning a real record", () => {
  for (const kind of ["citizen-feedback", "citizen-report", "citizen-contact"] as const) {
    assert.throws(() => simulateCitizenSubmission(kind, { comment: " " }));
    const result = simulateCitizenSubmission(kind, { comment: "Example observation about the irrigation canal." });
    assert.deepEqual(result, { simulated: true, kind });
  }
  assert.throws(() => simulateCitizenSubmission("citizen-report", { comment: "Too short" }));
  assert.throws(() => simulateCitizenSubmission("citizen-sms", { message: "Never send SMS in a guide" }));
});

test("citizen guide replay preserves completion and overview preferences", () => {
  const complete = { tourId: "citizen-feedback", outcome: "completed" as const, disableAutomatic: false };
  const progress = applyTourUpdate(EMPTY_TOUR_PROGRESS, complete);
  const replay = applyTourUpdate(progress, { ...complete, outcome: "skipped" });
  assert.equal(replay.seen[tourKey(complete.tourId)], "completed");
  assert.equal(replay.seen[tourKey(CITIZEN_OVERVIEW_ID)], undefined, "task guides do not dismiss the feature tour");
});

test("guide actions name their result and only explicitly activate navigation or example send controls", () => {
  const feedback = citizenGuideSteps("citizen-feedback");
  assert.deepEqual(feedback.slice(0, 4).map(({ action }) => action), [
    { label: "Open Projects", behavior: "activate" },
    { label: "View details", behavior: "activate" },
    { label: "Open Feedback", behavior: "activate" },
    { label: "Share feedback", behavior: "activate" },
  ]);
  const contact = citizenGuideSteps("citizen-contact");
  assert.deepEqual(contact.at(-2)?.action, { label: "Send example", behavior: "activate" });
  for (const guide of CITIZEN_GUIDES) {
    for (const step of citizenGuideSteps(guide.id)) {
      assert.notEqual(step.action?.label, "Go to control");
      if (step.target.includes("data-citizen-step")) {
        assert.equal(step.action?.behavior, "activate");
        assert.equal(step.actionTarget, `${step.allow} [data-citizen="form-next"]`, "form actions must use the actual forward button for the current stage");
      }
      if (step.advance === "done" || guide.id === "citizen-sms") assert.equal(step.action, undefined, "read-only content must not offer an action that does nothing");
    }
  }
});

test("navigation waits for the actual click and destination, including an already-open Projects page", () => {
  for (const guide of CITIZEN_GUIDES) {
    for (const step of citizenGuideSteps(guide.id).filter((step) => step.requireClick)) {
      assert.equal(citizenStepCanAdvance(step, false, true), false, `${step.title} must not be skipped because its destination is already visible`);
      assert.equal(citizenStepCanAdvance(step, true, false), false, "clicking must still wait for navigation to finish");
      assert.equal(citizenStepCanAdvance(step, true, true), true);
    }
  }
});

test("feedback details offers Next and waits for the real form to pass validation", () => {
  const details = citizenGuideSteps("citizen-feedback").find(({ title }) => title === "Write your feedback")!;
  assert.deepEqual(details.action, { label: "Next", behavior: "activate" });
  assert.match(details.target, /#comment$/);
  assert.equal(details.actionTarget, '[data-citizen-step="feedback-details"] [data-citizen="form-next"]');
  assert.equal(citizenStepCanAdvance(details, true, false), false, "clicking Next with validation errors must not move the guide");
  assert.equal(citizenStepCanAdvance(details, true, true), true);
  assert.equal(citizenGuideSteps("citizen-feedback").at(-2)?.action?.label, "Submit example");
});

test("E-Report includes the actual unlinked-project form steps and Contact Us starts in navigation", () => {
  const report = citizenGuideSteps("citizen-report");
  assert.match(report[0].target, /data-citizen-nav="\/report-issue"/);
  assert.match(report[1].target, /report-new/);
  assert.deepEqual(report.filter((step) => step.allow?.startsWith("[data-citizen-step=")).map((step) => step.allow), [
    "farm-operation", "project-type", "location", "match", "category", "issue-details", "contact", "review",
  ].map((name) => `[data-citizen-step="report-${name}"]`));
  const contact = citizenGuideSteps("citizen-contact");
  assert.match(contact[0].target, /more/);
  assert.match(contact[1].target, /data-citizen-nav="\/contact"/);
  assert.match(contact[2].target, /contact-details/);
});

test("E-Report teaches and requires the issue type and date before focusing on the description", () => {
  const steps = citizenGuideSteps("citizen-report");
  const descriptionIndex = steps.findIndex((step) => step.target.includes("report-description"));
  const issueType = steps[descriptionIndex - 2];
  const date = steps[descriptionIndex - 1];
  assert.equal(issueType.target, '[data-citizen="report-issue-types"]');
  assert.equal(date.target, '[data-citizen="report-date"]');
  for (const field of [issueType, date]) {
    assert.equal(field.advance, "next");
    assert.match(field.readyTarget!, /data-citizen-ready="true"/);
    assert.equal(field.actionTarget, undefined, "these steps must not trigger the form's Next button prematurely");
  }
  assert.equal(steps[descriptionIndex].minLength, 20);
  assert.match(steps[descriptionIndex].actionTarget!, /form-next/);
});

test("a report guide on the description returns to missing issue type and date before it can continue", () => {
  const steps = citizenGuideSteps("citizen-report");
  const description = steps.findIndex((item) => item.target.includes("report-description"));
  const issueType = steps.findIndex((item) => item.target === '[data-citizen="report-issue-types"]');
  const date = steps.findIndex((item) => item.target === '[data-citizen="report-date"]');
  const shown = new Set([steps[description].target, steps[issueType].target, steps[date].target]);
  const visible = (selector: string) => shown.has(selector);

  assert.equal(citizenStepToRevisit(steps, description, visible), issueType, "the screenshot state must highlight the missing issue type instead of leaving it off-screen");
  shown.add(steps[issueType].readyTarget!);
  assert.equal(citizenStepToRevisit(steps, description, visible), date);
  shown.add(steps[date].readyTarget!);
  assert.equal(citizenStepToRevisit(steps, description, visible), description);

  shown.delete(steps[issueType].readyTarget!);
  assert.equal(citizenStepToRevisit(steps, date, visible), issueType, "clearing an earlier answer must be recoverable on the next step too");
  shown.add(steps[issueType].readyTarget!);
  shown.delete(steps[date].readyTarget!);
  assert.equal(citizenStepToRevisit(steps, description, visible), date, "editing the date back to empty must point to the date field");
});

test("required-field recovery does not rewind during navigation, loading, or receipt display", () => {
  const steps = citizenGuideSteps("citizen-report");
  const description = steps.findIndex((item) => item.target.includes("report-description"));
  assert.equal(citizenStepToRevisit(steps, description, () => false), description);
  assert.equal(citizenStepToRevisit(steps, 0, () => true), 0);
  assert.equal(citizenStepToRevisit(steps, steps.length - 1, () => true), steps.length - 1);
  assert.equal(citizenStepToRevisit(steps, description, (selector) => selector === steps[description].target), description, "unmounted prerequisites cannot be mistaken for empty fields");
});
