import { NextResponse } from "next/server";
import { z } from "zod";

import { getProgressCurve } from "@/lib/analytics/managerial-dashboard-query";
import { hasPermission } from "@/lib/permissions";
import { hasAssignedModeratorScope, type ScopedUser } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import type { ManagerialDashboardProgressCurveData } from "@/types/managerial-dashboard.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsUser = ScopedUser & { id?: string } & Record<string, unknown>;

type ProgressCurveRouteDependencies = {
  getCurrentUser: () => Promise<AnalyticsUser | null>;
  canViewAnalytics: (role: string | null | undefined) => boolean;
  getProgressCurve: (
    projectId: string,
    user: AnalyticsUser,
  ) => Promise<ManagerialDashboardProgressCurveData | null>;
  reportError?: (error: unknown) => void;
};

const projectIdSchema = z.object({ projectId: z.string().trim().min(1).max(160) });

const defaultDependencies: ProgressCurveRouteDependencies = {
  getCurrentUser: async () => (await getCurrentUser()) as AnalyticsUser | null,
  canViewAnalytics: (role) => hasPermission(role, "analytics", "view"),
  getProgressCurve,
  reportError: () => console.error("Progress-curve request failed"),
};

export function createProgressCurveGetHandler(
  dependencies: ProgressCurveRouteDependencies = defaultDependencies,
) {
  return async function GET(request: Request) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!dependencies.canViewAnalytics(user.role) || !hasAssignedModeratorScope(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const params = new URL(request.url).searchParams;
      const { projectId } = projectIdSchema.parse({
        projectId: params.get("projectId") ?? undefined,
      });
      const data = await dependencies.getProgressCurve(projectId, user);
      if (!data) {
        return NextResponse.json(
          { error: "Project not found in the current scope" },
          { status: 404, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid progress-curve request" },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      dependencies.reportError?.(error);
      return NextResponse.json(
        { error: "Unable to load progress curve" },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

export const GET = createProgressCurveGetHandler();
