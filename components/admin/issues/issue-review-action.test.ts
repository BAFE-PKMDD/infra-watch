import assert from "node:assert/strict";
import { test } from "bun:test";

import { buildIssueReviewPayload, canSaveIssueReviewAction, createIssueReviewDraft } from "./issue-review-action";

const emptyDraft = {
  mode: "reply" as const,
  responseMessage: "",
  internalNotes: "",
  status: "" as const,
  publicDescription: "",
};

test("citizen reply sends only the citizen-facing message", () => {
  const draft = { ...emptyDraft, responseMessage: "We received your report and started checking it." };

  assert.equal(canSaveIssueReviewAction(draft), true);
  assert.deepEqual(buildIssueReviewPayload(draft), {
    message: "We received your report and started checking it.",
    internalNotes: "",
    newStatus: undefined,
    isInternalOnly: false,
    publishToPublic: false,
    publicDescription: "",
  });
});

test("staff note cannot be sent to the citizen", () => {
  const draft = { ...emptyDraft, mode: "note" as const, internalNotes: "Check the attached photo before assigning the report." };

  assert.equal(canSaveIssueReviewAction(draft), true);
  assert.deepEqual(buildIssueReviewPayload(draft), {
    message: "",
    internalNotes: "Check the attached photo before assigning the report.",
    newStatus: undefined,
    isInternalOnly: true,
    publishToPublic: false,
    publicDescription: "",
  });
});

test("status change requires both a new status and a staff note", () => {
  const incomplete = { ...emptyDraft, mode: "status" as const, status: "reviewing" as const };
  const complete = { ...incomplete, internalNotes: "Initial evidence review started." };

  assert.equal(canSaveIssueReviewAction(incomplete), false);
  assert.equal(canSaveIssueReviewAction(complete), true);
  assert.deepEqual(buildIssueReviewPayload(complete), {
    message: "",
    internalNotes: "Initial evidence review started.",
    newStatus: "reviewing",
    isInternalOnly: true,
    publishToPublic: false,
    publicDescription: "",
  });
});

test("public summary requires privacy-reviewed copy and never reuses private notes", () => {
  const tooShort = { ...emptyDraft, mode: "publish" as const, publicDescription: "Short summary" };
  const complete = {
    ...tooShort,
    internalNotes: "Private staff detail",
    publicDescription: "A reviewed infrastructure concern is being assessed by staff.",
  };

  assert.equal(canSaveIssueReviewAction(tooShort), false);
  assert.equal(canSaveIssueReviewAction(complete), true);
  assert.deepEqual(buildIssueReviewPayload(complete), {
    message: "",
    internalNotes: "",
    newStatus: undefined,
    isInternalOnly: false,
    publishToPublic: true,
    publicDescription: "A reviewed infrastructure concern is being assessed by staff.",
  });
});

test("changing action starts a blank draft for that action", () => {
  assert.deepEqual(createIssueReviewDraft("status"), {
    mode: "status",
    responseMessage: "",
    internalNotes: "",
    status: "",
    publicDescription: "",
  });
});
