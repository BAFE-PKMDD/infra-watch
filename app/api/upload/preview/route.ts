import { eq, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { downloadFile } from "@/lib/minio";
import { hasPermission } from "@/lib/permissions";
import { checkIssueScope } from "@/lib/scope";
import { canAccessIssueEvidence } from "./access";
import { createUploadPreviewGetHandler } from "./handler";

export const runtime = "nodejs";

const getHandler = createUploadPreviewGetHandler({
  getSessionUser: async (headers) => {
    const session = await auth.api.getSession({ headers });
    return session?.user
      ? {
          id: session.user.id,
          role: session.user.role as string | string[] | null | undefined,
          region: session.user.region,
          assignedAgency: session.user.assignedAgency,
        }
      : null;
  },
  canReadKnowledgeBase: (role) => hasPermission(role, "knowledge_base", "read"),
  canReadIssueEvidence: async (user, path) => {
    const [issue] = await db
      .select({
        reporterUserId: issues.reporterUserId,
        projectId: issues.projectId,
        region: issues.region,
      })
      .from(issues)
      .where(or(
        sql`${issues.evidence} @> ${JSON.stringify([{ url: path }])}::jsonb`,
        eq(issues.geoVideoUrl, path),
      ))
      .limit(1);

    if (!issue) return false;
    return canAccessIssueEvidence(user, issue, async () => {
      const scope = await checkIssueScope({
        role: "moderator",
        region: user.region,
        assignedAgency: user.assignedAgency,
      }, issue);
      return scope.allowed;
    });
  },
  loadMedia: downloadFile,
  onError: (error) => console.error("Upload preview failed", error),
});

export async function GET(request: NextRequest) {
  return getHandler(request);
}
