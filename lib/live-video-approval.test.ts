import assert from "node:assert/strict";
import test from "node:test";
import { assertVideoApproved, assertVideoRequestAccess, assertVideoReviewer, canReviewLiveVideos } from "./live-video-approval";

const requester = { id: "requester", role: "regional_admin", region: "R8" };
const video = { createdBy: "requester", region: "R8", approvalStatus: "pending" };

test("only NCR administrators can review and publish", () => {
  for (const role of ["admin", "regional_admin"]) {
    assert.equal(canReviewLiveVideos({ role, region: "National Capital Region (NCR)" }), true);
    for (const region of [null, "", "R8", "invalid"]) {
      assert.equal(canReviewLiveVideos({ role, region }), false);
      assert.throws(() => assertVideoReviewer({ role, region }), /Only an NCR/);
    }
  }
  assert.equal(canReviewLiveVideos({ role: "citizen", region: "NCR" }), false);
});

test("regional admins manage their own requests; NCR reviewers can manage all", () => {
  assert.doesNotThrow(() => assertVideoRequestAccess(requester, video));
  assert.throws(() => assertVideoRequestAccess({ ...requester, id: "other" }, video), /own video requests/);
  assert.doesNotThrow(() => assertVideoRequestAccess({ id: "reviewer", role: "admin", region: "NCR" }, video));
});

test("pending and rejected requests cannot be published", () => {
  for (const approvalStatus of ["pending", "rejected", "", "unknown"]) {
    assert.throws(() => assertVideoApproved({ approvalStatus }), /must be approved/);
  }
  assert.doesNotThrow(() => assertVideoApproved({ approvalStatus: "approved" }));
});
