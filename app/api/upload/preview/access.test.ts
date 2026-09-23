import assert from "node:assert/strict";
import test from "node:test";

import { canAccessIssueEvidence } from "./access";

const issue = {
  reporterUserId: "owner-1",
  projectId: "project-1",
  region: "Region IV-A",
};

test("issue evidence is limited to the owner, admins, and scoped moderators", async () => {
  const scopeCalls: string[] = [];
  const checkModeratorScope = async () => {
    scopeCalls.push("moderator");
    return true;
  };

  assert.equal(await canAccessIssueEvidence(
    { id: "owner-1", role: "citizen" },
    issue,
    checkModeratorScope,
  ), true);

  assert.equal(await canAccessIssueEvidence(
    { id: "other-citizen", role: "citizen" },
    issue,
    checkModeratorScope,
  ), false);

  assert.equal(await canAccessIssueEvidence(
    { id: "admin-1", role: "admin" },
    issue,
    checkModeratorScope,
  ), true);

  assert.deepEqual(scopeCalls, []);
});

test("moderator scope is enforced regardless of mixed-role ordering", async () => {
  let scopeCalls = 0;
  const deniedScope = async () => {
    scopeCalls += 1;
    return false;
  };

  assert.equal(await canAccessIssueEvidence(
    { id: "staff-1", role: ["citizen", "moderator"] },
    issue,
    deniedScope,
  ), false);
  assert.equal(scopeCalls, 1);

  assert.equal(await canAccessIssueEvidence(
    { id: "admin-1", role: ["citizen", "admin"] },
    issue,
    deniedScope,
  ), true);
  assert.equal(scopeCalls, 1);
});
