import { NextResponse } from "next/server";
import { z } from "zod";

import { parseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { getDashboardBreakdown } from "@/lib/analytics/managerial-dashboard-query";
import { hasPermission } from "@/lib/permissions";
import { hasAssignedModeratorScope, type ScopedUser } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import type {
  DashboardBreakdownDimension,
  ManagerialDashboardBreakdownData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsUser = ScopedUser & { id?: string } & Record<string, unknown>;

type BreakdownRouteDependencies = {
  getCurrentUser: () => Promise<AnalyticsUser | null>;
  canViewAnalytics: (role: string | null | undefined) => boolean;
  getBreakdownData: (
    filters: ManagerialDashboardFilters,
    user: AnalyticsUser,
    dimension: DashboardBreakdownDimension,
  ) => Promise<ManagerialDashboardBreakdownData>;
  reportError?: (error: unknown) => void;
};

const dimensionSchema = z.object({
  dimension: z.enum(["province", "program"]),
});

const defaultDependencies: BreakdownRouteDependencies = {
  getCurrentUser: async () => (await getCurrentUser()) as AnalyticsUser | null,
  canViewAnalytics: (role) => hasPermission(role, "analytics", "view"),
  getBreakdownData: getDashboardBreakdown,
  reportError: () => console.error("Dashboard breakdown request failed"),
};

export function createAnalyticsBreakdownGetHandler(
  dependencies: BreakdownRouteDependencies = defaultDependencies,
) {
  return async function GET(request: Request) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!dependencies.canViewAnalytics(user.role) || !hasAssignedModeratorScope(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const params = new URL(request.url).searchParams;
      const filters = parseManagerialDashboardFilters(params);
      const { dimension } = dimensionSchema.parse({
        dimension: params.get("dimension") ?? undefined,
      });
      const data = await dependencies.getBreakdownData(filters, user, dimension);
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid breakdown request" },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      dependencies.reportError?.(error);
      return NextResponse.json(
        { error: "Unable to load chart breakdown" },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

export const GET = createAnalyticsBreakdownGetHandler();
