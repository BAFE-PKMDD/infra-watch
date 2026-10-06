import assert from "node:assert/strict";
import { test } from "bun:test";
import { availableResponseLessons, lessonPath } from "./tutorials";
import { applyTourUpdate, EMPTY_TOUR_PROGRESS, tourKey } from "./progress";
import { INITIAL_LIVE_STATE, liveTutorialSteps, reconcileLiveTutorial, reduceLiveTutorial } from "./live-tutorial";
import { applySandboxAction, createTutorialSandbox, runTutorialMutation, TUTORIAL_CONTACT_ID, TUTORIAL_FEEDBACK_ID } from "./sandbox";
import { applyTutorialSmsReply, createTutorialSms, TUTORIAL_SMS_ID } from "./sms-sandbox";

test("staff get four response achievements and citizens get none", () => {
  for (const role of ["admin", "regional_admin", "moderator"]) {
    const lessons = availableResponseLessons({ role });
    assert.deepEqual(lessons.map((lesson) => lesson.resource), ["issues", "feedback", "sms", "contact_messages"]);
    assert.equal(lessons.some((lesson) => lesson.action === "delete" || ["note", "status", "publish"].includes(lesson.kind)), false);
    assert.equal(lessons[1].kind, "feedback-reply", "the Feedback achievement must teach responding, not approval");
    assert.equal(lessonPath(lessons[2]), "/learn/sms-grievances", "production lessons must not enable the gated live SMS queue");
  }
  assert.deepEqual(availableResponseLessons({ role: "citizen" }), []);
});

test("Feedback achievement requires a simulated reply, not a moderation decision", () => {
  const lesson = availableResponseLessons({ role: "admin" }).find((item) => item.kind === "feedback-reply")!;
  const steps = liveTutorialSteps(lesson);
  assert.deepEqual(steps.map((step) => step.id), ["record", "open", "write", "save", "result"]);
  const state = { ...INITIAL_LIVE_STATE, recordId: TUTORIAL_FEEDBACK_ID, index: 3 };
  const detail = { resource: "feedback" as const, recordId: TUTORIAL_FEEDBACK_ID, action: "approved" as const, outcome: "success" as const, simulated: true };
  assert.equal(reduceLiveTutorial(state, { type: "mutation", detail }, lesson), state);
  assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, action: "reply" } }, lesson).saved, true);
});

test("Feedback practice posts only to temporary history, skips persistence, and resets on replay", async () => {
  const state = createTutorialSandbox("feedback-attempt", "feedback-reply");
  assert.equal(state.feedback?.status, "approved", "the lesson bypasses approval");
  let writes = 0;
  const result = await runTutorialMutation({
    sandbox: true, recordId: TUTORIAL_FEEDBACK_ID,
    simulate: () => applySandboxAction(state, { resource: "feedback", recordId: TUTORIAL_FEEDBACK_ID, action: "reply", body: "We have requested an inspection." }),
    persist: async () => { writes++; return state; },
  });
  assert.equal(writes, 0, "posting and its subscriber notifications must never run");
  assert.equal(result.data.feedbackComments[0].comment, "We have requested an inspection.");
  assert.equal(result.data.feedback?.status, "approved");
  assert.equal(state.feedbackComments.length, 0);
  assert.equal(createTutorialSandbox("next-attempt", "feedback-reply").feedbackComments.length, 0);
  assert.throws(() => applySandboxAction(state, { resource: "feedback", recordId: TUTORIAL_FEEDBACK_ID, action: "reply", body: "  " }), /Write an example reply/);
  assert.throws(() => applySandboxAction(state, { resource: "feedback", recordId: "real-feedback", action: "reply", body: "reply" }), /tutorial feedback/);
});

test("skipping cannot earn an achievement or remove one earned on an earlier attempt", () => {
  const update = { tourId: "live-reply", outcome: "skipped" as const, disableAutomatic: false };
  const skipped = applyTourUpdate(EMPTY_TOUR_PROGRESS, update);
  assert.equal(skipped.seen[tourKey(update.tourId)], "skipped");
  const completed = applyTourUpdate(skipped, { ...update, outcome: "completed" });
  assert.equal(applyTourUpdate(completed, update).seen[tourKey(update.tourId)], "completed");
});

test("SMS lesson follows its own case page and completes only after a simulated reply", () => {
  const lesson = availableResponseLessons({ role: "admin" }).find((item) => item.kind === "sms-reply")!;
  let state = { ...INITIAL_LIVE_STATE, recordId: TUTORIAL_SMS_ID, index: 1 };
  assert.equal(reconcileLiveTutorial(state, lesson, { onIssueList: false }), null);
  const arrived = reconcileLiveTutorial(state, lesson, { onIssueList: false, issueDetailId: TUTORIAL_SMS_ID });
  assert.ok(arrived);
  state = reduceLiveTutorial(state, arrived, lesson) as typeof state;
  assert.equal(liveTutorialSteps(lesson)[state.index].target, '[data-tour="sms-reply-box"]');
  const event = { resource: "sms" as const, recordId: TUTORIAL_SMS_ID, action: "reply" as const, outcome: "success" as const };
  assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: event }, lesson), state);
  assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...event, simulated: true } }, lesson).saved, true);
  assert.deepEqual(reconcileLiveTutorial(state, lesson, { onIssueList: true }), { type: "reset" });
});

test("contact lesson advances from email preview to status and does not complete on reply alone", () => {
  const lesson = availableResponseLessons({ role: "admin" }).find((item) => item.kind === "contact-reply")!;
  const state = { ...INITIAL_LIVE_STATE, recordId: TUTORIAL_CONTACT_ID, index: 3 };
  assert.deepEqual(reconcileLiveTutorial(state, lesson, { onIssueList: true, containerRecordId: TUTORIAL_CONTACT_ID, openedRecordId: TUTORIAL_CONTACT_ID }), { type: "step", index: 4 });
  const detail = { resource: "contact_messages" as const, recordId: TUTORIAL_CONTACT_ID, action: "reply" as const, outcome: "success" as const, simulated: true };
  assert.equal(reduceLiveTutorial(state, { type: "mutation", detail }, lesson), state);
  assert.equal(reduceLiveTutorial(state, { type: "mutation", detail: { ...detail, action: "resolved" } }, lesson).saved, true);
});

test("contact practice requires a reply before resolution, never persists, and resets on restart", async () => {
  let state = createTutorialSandbox("first-attempt");
  let writes = 0;
  const resolve = { resource: "contact_messages" as const, recordId: TUTORIAL_CONTACT_ID, action: "status" as const, status: "resolved" as const };
  assert.throws(() => applySandboxAction(state, resolve), /Practice the email reply/);
  for (const action of [{ resource: "contact_messages" as const, recordId: TUTORIAL_CONTACT_ID, action: "reply" as const, body: "The inspection is being scheduled." }, resolve]) {
    const result = await runTutorialMutation({ sandbox: true, recordId: action.recordId, simulate: () => applySandboxAction(state, action), persist: async () => { writes++; return state; } });
    state = result.data;
  }
  assert.equal(state.contact.status, "resolved");
  assert.equal(writes, 0);
  assert.equal(createTutorialSandbox("next-attempt").contactReply, "");
  assert.throws(() => applySandboxAction(state, { ...resolve, recordId: "real-contact" }), /tutorial contact/);
  await assert.rejects(() => runTutorialMutation({ sandbox: false, recordId: TUTORIAL_CONTACT_ID, simulate: () => state, persist: async () => { writes++; return state; } }), /tutorial has ended/);
  assert.equal(writes, 0);
});

test("SMS practice uses masked example data and a temporary conversation only", () => {
  const record = createTutorialSms();
  const result = applyTutorialSmsReply(record, "An inspection has been requested.");
  assert.equal(record.conversation.length, 1);
  assert.equal(result.conversation.length, 2);
  assert.equal(result.localSimulated, false, "staff gateway simulation must never be enabled for lessons");
  assert.equal(result.deliveryStatus, "simulated_delivered");
  assert.match(record.contactNumber, /\*/);
  assert.match(result.conversation.at(-1)!.body, /No message was sent/);
  assert.throws(() => applyTutorialSmsReply(record, "  "), /Response is required/);
  assert.throws(() => applyTutorialSmsReply({ ...record, id: "real-sms" }, "Reply"), /tutorial SMS/);
  assert.equal(createTutorialSms().conversation.length, 1);
});
