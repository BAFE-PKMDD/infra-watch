import assert from "node:assert/strict";
import test from "node:test";

import { planIssueResponseRecord } from "./issue-response-policy";

test("publishing only a reviewed summary does not create a duplicate response", () => {
  assert.equal(planIssueResponseRecord({
    message: "",
    internalNotes: "",
    nextStatus: null,
    isInternalOnly: false,
  }), null);
});

test("citizen reply remains a public response", () => {
  assert.deepEqual(planIssueResponseRecord({
    message: "We are reviewing your report.",
    internalNotes: "",
    nextStatus: null,
    isInternalOnly: false,
  }), {
    message: "We are reviewing your report.",
    internalNotes: null,
    isInternalOnly: false,
  });
});

test("staff notes and status reasons remain staff only", () => {
  assert.deepEqual(planIssueResponseRecord({
    message: "",
    internalNotes: "Evidence review started.",
    nextStatus: "reviewing",
    isInternalOnly: true,
  }), {
    message: "Evidence review started.",
    internalNotes: "Evidence review started.",
    isInternalOnly: true,
  });
});

test("staff-only attachment entries are preserved without public text", () => {
  assert.deepEqual(planIssueResponseRecord({
    message: "",
    internalNotes: "",
    nextStatus: null,
    isInternalOnly: true,
    hasAttachments: true,
  }), {
    message: "Attachment added",
    internalNotes: null,
    isInternalOnly: true,
  });
});
