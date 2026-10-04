import assert from "node:assert/strict";
import { test } from "bun:test";
import { applySandboxAction, createTutorialSandbox, runTutorialMutation, TUTORIAL_FEEDBACK_ID, TUTORIAL_ISSUE_ID, type SandboxAction } from "./sandbox";
import { buildIssueReviewPayload, createIssueReviewDraft } from "@/components/admin/issues/issue-review-action";

test("every tutorial action updates only an isolated example and never calls persistence", async () => {
  const actions: SandboxAction[] = [
    ...(["reply", "note", "status", "publish"] as const).map((mode): SandboxAction => ({
      resource: "issues", recordId: TUTORIAL_ISSUE_ID, action: mode,
      payload: buildIssueReviewPayload({ ...createIssueReviewDraft(mode), responseMessage: "We will inspect the canal.", internalNotes: "Inspection requested.", status: "resolved", publicDescription: "A canal inspection has been requested for this example." }),
    })),
    { resource: "issues", recordId: TUTORIAL_ISSUE_ID, action: "delete" },
    { resource: "feedback", recordId: TUTORIAL_FEEDBACK_ID, action: "approved", moderationNote: "Example approval" },
    { resource: "feedback", recordId: TUTORIAL_FEEDBACK_ID, action: "rejected" },
    { resource: "feedback", recordId: TUTORIAL_FEEDBACK_ID, action: "delete" },
  ];
  let writes = 0;
  for (const action of actions) {
    const original = createTutorialSandbox("session-a");
    const before = JSON.stringify(original);
    const result = await runTutorialMutation({
      sandbox: true, recordId: action.recordId,
      simulate: () => applySandboxAction(original, action),
      persist: async () => { writes += 1; return original; },
    });
    assert.equal(result.simulated, true);
    assert.equal(JSON.stringify(original), before, "simulation must not mutate the source snapshot");
    if (action.resource === "issues") {
      if (action.action === "delete") assert.equal(result.data.issue, null);
      else {
        assert.equal(result.data.issue?.responses.length, 1);
        if (action.action === "reply") assert.equal(result.data.issue?.responses[0].message, "We will inspect the canal.");
        if (action.action === "note") assert.equal(result.data.issue?.responses[0].isInternalOnly, true);
        if (action.action === "status") assert.equal(result.data.issue?.status, "resolved");
        if (action.action === "publish") assert.equal(result.data.issue?.publicDescription, action.payload.publicDescription);
      }
    } else if (action.action === "delete") assert.equal(result.data.feedback, null);
    else assert.equal(result.data.feedback?.status, action.action);
  }
  assert.equal(writes, 0, "no POST, PATCH, or DELETE persistence callback may run");
});

test("example IDs cannot reach persistence after closing or refreshing a tutorial", async () => {
  let writes = 0;
  for (const recordId of [TUTORIAL_ISSUE_ID, TUTORIAL_FEEDBACK_ID]) {
    await assert.rejects(() => runTutorialMutation({ sandbox: false, recordId, simulate: () => ({}), persist: async () => { writes += 1; return {}; } }), /tutorial has ended/);
  }
  assert.equal(writes, 0);
});

test("a mismatched real record is blocked during tutorial mode, even if simulation fails", async () => {
  let writes = 0;
  const sandbox = createTutorialSandbox("session-a");
  await assert.rejects(() => runTutorialMutation({
    sandbox: true, recordId: "real-report-id",
    simulate: () => applySandboxAction(sandbox, { resource: "issues", recordId: "real-report-id", action: "delete" }),
    persist: async () => { writes += 1; return sandbox; },
  }), /tutorial report/);
  assert.equal(writes, 0);
});

test("normal operations still use persistence outside tutorial mode", async () => {
  let writes = 0;
  const result = await runTutorialMutation({ sandbox: false, recordId: "real-report-id", simulate: () => { throw new Error("unexpected simulation"); }, persist: async () => { writes += 1; return { ok: true }; } });
  assert.deepEqual(result, { simulated: false, data: { ok: true } });
  assert.equal(writes, 1);
});

test("restarting a tutorial discards previous draft history, moderation, and deletions", () => {
  const first = createTutorialSandbox("session-a");
  const deleted = applySandboxAction(first, { resource: "issues", recordId: TUTORIAL_ISSUE_ID, action: "delete" });
  assert.equal(deleted.issue, null);
  const restarted = createTutorialSandbox("session-b");
  assert.equal(restarted.issue?.id, TUTORIAL_ISSUE_ID);
  assert.deepEqual(restarted.issue?.responses, []);
  assert.equal(restarted.feedback?.status, "pending");
  assert.equal(restarted.feedback?.moderationNote, null);
});
