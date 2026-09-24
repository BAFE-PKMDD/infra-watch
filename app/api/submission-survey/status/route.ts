import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissionSurveys } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type RouteDependencies = {
  getSession?: (req: NextRequest) => Promise<{ user?: { id?: string } } | null>;
  hasResponded?: (userId: string) => Promise<boolean>;
};

async function defaultHasResponded(userId: string) {
  const [existing] = await db
    .select({ id: submissionSurveys.id })
    .from(submissionSurveys)
    .where(eq(submissionSurveys.userId, userId))
    .limit(1);
  return Boolean(existing);
}

/**
 * Whether this account has already been asked the "who's using InfraWatch" survey
 * (answered or skipped, on either an e-report or a feedback comment). Gates whether
 * the survey modal should intercept their next submission - it should only ever
 * interrupt them once per account.
 */
export function createSubmissionSurveyStatusHandler(deps: RouteDependencies = {}) {
  const getSession = deps.getSession ?? (async (req: NextRequest) => auth.api.getSession({ headers: req.headers }).catch(() => null));
  const hasResponded = deps.hasResponded ?? defaultHasResponded;

  return async function GET(request: NextRequest) {
    try {
      const session = await getSession(request);
      const userId = session?.user?.id;

      if (!userId) {
        return NextResponse.json({ success: true, data: { hasResponded: false } });
      }

      return NextResponse.json({ success: true, data: { hasResponded: await hasResponded(userId) } });
    } catch (error) {
      console.error("Failed to check submission survey status:", error);
      // Fail open: a broken status check should never block citizen reporting.
      return NextResponse.json({ success: true, data: { hasResponded: false } });
    }
  };
}

export const GET = createSubmissionSurveyStatusHandler();
