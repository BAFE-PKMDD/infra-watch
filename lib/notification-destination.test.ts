import assert from "node:assert/strict";
import { test } from "bun:test";
import { getNotificationDestination } from "./notification-destination";

test("staff notifications lead to the admin dashboard with or without a project", () => {
  for (const role of ["admin", "regional_admin", "moderator"]) {
    assert.equal(getNotificationDestination({ metadata: { projectId: "project-1" } }, role), "/dashboard");
    assert.equal(getNotificationDestination({ metadata: { issueId: "issue-1" } }, role), "/dashboard");
    assert.equal(getNotificationDestination({}, role), "/dashboard");
  }
});

test("citizens keep project links and never receive an admin destination", () => {
  assert.equal(getNotificationDestination({ metadata: { projectId: "project/1" } }, "citizen"), "/projects/project%2F1");
  assert.equal(getNotificationDestination({ metadata: { issueId: "issue-1" } }, "citizen"), null);
  assert.equal(getNotificationDestination({ metadata: { projectId: 123 } }, "citizen"), null);
  assert.equal(getNotificationDestination({}, undefined), null);
});
