export type IssueEvidenceUser = {
  id: string;
  role?: string | string[] | null;
  region?: string | null;
  assignedAgency?: string | null;
};

export type IssueEvidenceRecord = {
  reporterUserId?: string | null;
  projectId?: string | null;
  region?: string | null;
};

export async function canAccessIssueEvidence(
  user: IssueEvidenceUser,
  issue: IssueEvidenceRecord,
  checkModeratorScope: () => Promise<boolean>,
): Promise<boolean> {
  if (issue.reporterUserId === user.id) {
    return true;
  }

  const roles = Array.isArray(user.role) ? user.role : user.role ? [user.role] : [];
  if (roles.includes("admin")) {
    return true;
  }

  if (!roles.includes("moderator")) {
    return false;
  }

  return checkModeratorScope();
}
