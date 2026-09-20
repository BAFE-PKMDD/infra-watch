import { user } from "@/auth-schema";
import { db } from "@/lib/db";
import {
  checkIssueScope,
  checkModeratorScope,
  hasAssignedModeratorScope,
} from "@/lib/scope";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

export type StaffNotificationCandidate = {
  id: string;
  role: string | null;
  region: string | null;
  assignedAgency: string | null;
  banned: boolean | null;
};

export async function selectStaffNotificationRecipients(
  candidates: StaffNotificationCandidate[],
  canModeratorAccess: (candidate: StaffNotificationCandidate) => Promise<boolean>,
) {
  const recipientIds: string[] = [];

  for (const candidate of candidates) {
    if (candidate.banned || (candidate.role !== "admin" && candidate.role !== "moderator")) {
      continue;
    }
    if (candidate.role === "admin") {
      recipientIds.push(candidate.id);
      continue;
    }
    if (!hasAssignedModeratorScope(candidate)) continue;
    if (await canModeratorAccess(candidate)) recipientIds.push(candidate.id);
  }

  return Array.from(new Set(recipientIds));
}

async function listEligibleStaff(): Promise<StaffNotificationCandidate[]> {
  return db
    .select({
      id: user.id,
      role: user.role,
      region: user.region,
      assignedAgency: user.assignedAgency,
      banned: user.banned,
    })
    .from(user)
    .where(
      andStaffEligibility(),
    );
}

function andStaffEligibility() {
  return and(
    inArray(user.role, ["admin", "moderator"]),
    or(eq(user.banned, false), isNull(user.banned)),
  )!;
}

export async function getIssueNotificationRecipientIds(issue: {
  projectId?: string | null;
  region?: string | null;
}) {
  const candidates = await listEligibleStaff();
  return selectStaffNotificationRecipients(candidates, async (candidate) => {
    const result = await checkIssueScope(candidate, issue);
    return result.allowed;
  });
}

export async function getProjectNotificationRecipientIds(projectId: string) {
  const candidates = await listEligibleStaff();
  return selectStaffNotificationRecipients(candidates, async (candidate) => {
    const result = await checkModeratorScope(candidate, projectId);
    return result.allowed;
  });
}

export type FollowUpRecipients = { adminIds: string[]; moderatorIds: string[] };

/**
 * Same eligible-staff pool as getIssueNotificationRecipientIds/getProjectNotificationRecipientIds,
 * but split by role instead of merged into one list — the SLA follow-up job needs to notify
 * moderators and admins at different checkpoints (moderator-only at the first reminder,
 * moderator+admin at the escalation, admin-only at breach).
 */
async function splitStaffFollowUpRecipients(
  candidates: StaffNotificationCandidate[],
  canModeratorAccess: (candidate: StaffNotificationCandidate) => Promise<boolean>,
): Promise<FollowUpRecipients> {
  const adminIds: string[] = [];
  const moderatorIds: string[] = [];

  for (const candidate of candidates) {
    if (candidate.banned || (candidate.role !== "admin" && candidate.role !== "moderator")) {
      continue;
    }
    if (candidate.role === "admin") {
      adminIds.push(candidate.id);
      continue;
    }
    if (!hasAssignedModeratorScope(candidate)) continue;
    if (await canModeratorAccess(candidate)) moderatorIds.push(candidate.id);
  }

  return {
    adminIds: Array.from(new Set(adminIds)),
    moderatorIds: Array.from(new Set(moderatorIds)),
  };
}

export async function getIssueFollowUpRecipients(issue: {
  projectId?: string | null;
  region?: string | null;
}): Promise<FollowUpRecipients> {
  const candidates = await listEligibleStaff();
  return splitStaffFollowUpRecipients(candidates, async (candidate) => {
    const result = await checkIssueScope(candidate, issue);
    return result.allowed;
  });
}

export async function getProjectFollowUpRecipients(projectId: string): Promise<FollowUpRecipients> {
  const candidates = await listEligibleStaff();
  return splitStaffFollowUpRecipients(candidates, async (candidate) => {
    const result = await checkModeratorScope(candidate, projectId);
    return result.allowed;
  });
}
