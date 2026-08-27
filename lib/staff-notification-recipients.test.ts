import assert from "node:assert/strict";
import test from "node:test";

import {
  selectStaffNotificationRecipients,
  type StaffNotificationCandidate,
} from "./staff-notification-recipients";

const candidates: StaffNotificationCandidate[] = [
  { id: "admin-1", role: "admin", region: null, assignedAgency: null, banned: false },
  { id: "moderator-in-scope", role: "moderator", region: "03", assignedAgency: "AMEFIP", banned: false },
  { id: "moderator-out-of-scope", role: "moderator", region: "08", assignedAgency: "AMIA", banned: false },
  { id: "moderator-unassigned", role: "moderator", region: null, assignedAgency: null, banned: false },
  { id: "banned-admin", role: "admin", region: null, assignedAgency: null, banned: true },
  { id: "citizen-1", role: "citizen", region: null, assignedAgency: null, banned: false },
];

test("staff notification recipients include admins and only scoped eligible moderators", async () => {
  const recipients = await selectStaffNotificationRecipients(
    candidates,
    async (candidate) => candidate.id === "moderator-in-scope",
  );
  assert.deepEqual(recipients, ["admin-1", "moderator-in-scope"]);
});

test("banned, citizen, and unassigned moderator accounts never receive operational alerts", async () => {
  const recipients = await selectStaffNotificationRecipients(candidates, async () => true);
  assert.deepEqual(recipients, ["admin-1", "moderator-in-scope", "moderator-out-of-scope"]);
});
