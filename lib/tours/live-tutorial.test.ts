import assert from "node:assert/strict";
import { test } from "bun:test";
import { canAdvanceLiveStep, INITIAL_LIVE_STATE, liveTutorialSteps, reconcileLiveTutorial, reduceLiveTutorial } from "./live-tutorial";
import { availableTaskTutorials, TASK_TUTORIALS, type TutorialKind } from "./tutorials";
import { tourUpdateSchema } from "./progress";
import type { TutorialActionEvent } from "./events";

const task = (kind: TutorialKind) => TASK_TUTORIALS.find((item) => item.kind === kind)!;
const observation = { onIssueList: false };

test("Respond follows the real case page and survives the loading gap", () => {
  const tutorial = task("reply");
  let state = reduceLiveTutorial(INITIAL_LIVE_STATE, { type: "select", recordId: "report-a" }, tutorial);
  state = reduceLiveTutorial(state, { type: "step", index: 1 }, tutorial);
  assert.equal(reconcileLiveTutorial(state, tutorial, observation), null, "navigation must wait for the real case DOM");
  const arrived = reconcileLiveTutorial(state, tutorial, { ...observation, issueDetailId: "report-a" });
  assert.ok(arrived);
  state = reduceLiveTutorial(state, arrived, tutorial);
  assert.equal(state.recordId, "report-a");
  assert.equal(liveTutorialSteps(tutorial)[state.index].target, "#review-action");
  assert.deepEqual(reconcileLiveTutorial(state, tutorial, { onIssueList: true }), { type: "reset" }, "browser Back returns to the report list step");
});

test("starting on a case and opening a different real case bind the correct record", () => {
  const tutorial = task("note");
  const arrived = reconcileLiveTutorial(INITIAL_LIVE_STATE, tutorial, { ...observation, issueDetailId: "report-b" });
  assert.deepEqual(arrived, { type: "select", recordId: "report-b", index: 2 });
  const state = { ...INITIAL_LIVE_STATE, index: 4, recordId: "report-a" };
  assert.deepEqual(reconcileLiveTutorial(state, tutorial, { ...observation, issueDetailId: "report-b" }), arrived);
});

test("empty lists wait without creating example records or advancing", () => {
  for (const tutorial of TASK_TUTORIALS) {
    assert.equal(reconcileLiveTutorial(INITIAL_LIVE_STATE, tutorial, observation), null);
    assert.equal(canAdvanceLiveStep(liveTutorialSteps(tutorial)[0], "", false), false);
  }
});

test("reply and publication steps require the actual selected action and entered content", () => {
  const replySteps = liveTutorialSteps(task("reply"));
  assert.equal(canAdvanceLiveStep(replySteps[2], "note", true), false);
  assert.equal(canAdvanceLiveStep(replySteps[2], "reply", true), true);
  const reply = replySteps.find((step) => step.id === "write")!;
  assert.equal(canAdvanceLiveStep(reply, "   ", true), false);
  assert.equal(canAdvanceLiveStep(reply, "We are reviewing the submitted evidence.", true), true);
  const publish = liveTutorialSteps(task("publish")).find((step) => step.id === "write")!;
  assert.equal(canAdvanceLiveStep(publish, "too short", true), false);
  assert.equal(canAdvanceLiveStep(publish, "A reviewed summary of the infrastructure concern.", true), true);
  assert.deepEqual(reconcileLiveTutorial({ ...INITIAL_LIVE_STATE, index: 4, recordId: "report-a" }, task("reply"), { ...observation, issueDetailId: "report-a", reviewMode: "note" }), { type: "step", index: 2 });
});

test("delete confirmation is tied to the selected record and Cancel returns to Delete", () => {
  for (const kind of ["delete-issue", "delete-feedback"] as const) {
    const tutorial = task(kind);
    const state = { ...INITIAL_LIVE_STATE, index: 1, recordId: "record-a" };
    assert.equal(reconcileLiveTutorial(state, tutorial, { ...observation, openedRecordId: "record-b" }), null);
    assert.deepEqual(reconcileLiveTutorial(state, tutorial, { ...observation, openedRecordId: "record-a" }), { type: "step", index: 2 });
    assert.deepEqual(reconcileLiveTutorial({ ...state, index: 2 }, tutorial, observation), { type: "step", index: 1 });
    assert.equal(reconcileLiveTutorial({ ...state, index: 2, pending: true }, tutorial, observation), null, "dialog closure while deleting is not a cancellation");
  }
});

test("only a successful simulated action for this record completes a tutorial", () => {
  for (const tutorial of TASK_TUTORIALS) {
    let state = { ...INITIAL_LIVE_STATE, recordId: "record-a" };
    const action = tutorial.action === "delete" ? "delete" : tutorial.kind === "approve-feedback" ? "approved" : tutorial.kind === "reject-feedback" ? "rejected" : tutorial.kind === "sms-reply" || tutorial.kind === "feedback-reply" ? "reply" : tutorial.kind === "contact-reply" ? "resolved" : tutorial.kind as "reply" | "note" | "status" | "publish";
    const detail: TutorialActionEvent = { resource: tutorial.resource, recordId: "record-a", action, outcome: "success", simulated: true };
    assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, simulated: false } }, tutorial), state);
    assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, recordId: "record-b" } }, tutorial), state);
    assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, resource: tutorial.resource === "issues" ? "feedback" : "issues" } }, tutorial), state);
    assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, action: action === "reply" ? "note" : "reply" } }, tutorial), state);
    assert.equal(reduceLiveTutorial(state, { type: "step", index: liveTutorialSteps(tutorial).length - 1 }, tutorial), state, "Next cannot simulate success");
    state = reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, outcome: "pending" } }, tutorial) as typeof state;
    assert.equal(state.pending, true);
    assert.equal(state.saved, false);
    assert.equal(reduceLiveTutorial(state, { type: "reset" }, tutorial), state);
    state = reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, outcome: "error" } }, tutorial) as typeof state;
    assert.equal(state.saved, false);
    assert.equal(state.pending, false);
    assert.equal(state.error, true);
    state = reduceLiveTutorial(state, { type: "mutation", detail }, tutorial) as typeof state;
    assert.equal(state.saved, true);
    assert.equal(state.error, false);
    assert.equal(liveTutorialSteps(tutorial)[state.index].id, "result");
  }
});

test("feedback moderation uses real details, optional note, and final confirmation", () => {
  const tutorial = task("approve-feedback");
  const state = { ...INITIAL_LIVE_STATE, index: 1, recordId: "feedback-a" };
  assert.deepEqual(reconcileLiveTutorial(state, tutorial, { ...observation, openedRecordId: "feedback-a" }), { type: "step", index: 2 });
  const steps = liveTutorialSteps(tutorial);
  assert.equal(canAdvanceLiveStep(steps[3], "", true), true);
  assert.equal(canAdvanceLiveStep(steps[4], "", true), false, "Confirm must happen on the actual form");
  assert.deepEqual(reconcileLiveTutorial({ ...state, index: 3 }, tutorial, observation), { type: "step", index: 2 });
});

test("live tutorials respect permissions and are valid account progress IDs", () => {
  for (const tutorial of TASK_TUTORIALS) assert.equal(tourUpdateSchema.safeParse({ tourId: tutorial.id, outcome: "completed", disableAutomatic: false }).success, true);
  assert.deepEqual(availableTaskTutorials({ role: "citizen" }), []);
  assert.equal(availableTaskTutorials({ role: "admin" }, "feedback").every((tutorial) => tutorial.resource === "feedback"), true);
  assert.equal(availableTaskTutorials({ role: "admin" }, "issue-detail").every((tutorial) => tutorial.resource === "issues"), true);
  assert.deepEqual(availableTaskTutorials({ role: "unknown" }), []);
  assert.equal(availableTaskTutorials({ role: "moderator" }).filter((tutorial) => tutorial.action === "delete").length, 2, "moderators can delete issues and feedback under the existing permission policy");
});
