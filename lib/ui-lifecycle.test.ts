import assert from "node:assert/strict";
import test from "node:test";

import {
  getFeedbackTargetPage,
  getProjectPreviewView,
  shouldRunOtpTimer,
} from "./ui-lifecycle";

test("OTP timer remains active after expiry so resend can establish a new deadline", () => {
  assert.equal(shouldRunOtpTimer(false), true);
});

test("OTP timer stops after verification succeeds", () => {
  assert.equal(shouldRunOtpTimer(true), false);
});

test("feedback pagination preserves a valid page during content-only refetches", () => {
  assert.equal(
    getFeedbackTargetPage({
      currentPage: 2,
      totalPages: 3,
      highlightedIndex: -1,
      itemsPerPage: 5,
    }),
    2,
  );
});

test("feedback pagination clamps the current page when the collection shrinks", () => {
  assert.equal(
    getFeedbackTargetPage({
      currentPage: 3,
      totalPages: 1,
      highlightedIndex: -1,
      itemsPerPage: 5,
    }),
    1,
  );
});

test("feedback pagination selects the page containing a highlighted feedback", () => {
  assert.equal(
    getFeedbackTargetPage({
      currentPage: 1,
      totalPages: 3,
      highlightedIndex: 6,
      itemsPerPage: 5,
    }),
    2,
  );
});

const oldProject = { id: "old-project", name: "Old Project" };

test("project preview hides stale data while a different project loads", () => {
  assert.deepEqual(
    getProjectPreviewView({
      open: true,
      projectId: "new-project",
      requestState: {
        projectId: "old-project",
        project: oldProject,
      },
    }),
    { project: null, loading: true },
  );
});

test("project preview settles loading when a request returns no project", () => {
  assert.deepEqual(
    getProjectPreviewView({
      open: true,
      projectId: "new-project",
      requestState: {
        projectId: "new-project",
        project: null,
      },
    }),
    { project: null, loading: false },
  );
});
