import { NextResponse } from "next/server";
import { z } from "zod";

import { parseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { getRegionCostByType } from "@/lib/analytics/managerial-dashboard-query";
import { hasPermission } from "@/lib/permissions";
import { hasAssignedModeratorScope, type ScopedUser } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import type {
  ManagerialDashboardCostByRegionData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsUser = ScopedUser & { id?: string } & Record<string, unknown>;

type CostByRegionRouteDependencies = {
  getCurrentUser: () => Promise<AnalyticsUser | null>;
  canViewAnalytics: (role: string | null | undefined) => boolean;
  getCostByRegion: (
    filters: ManagerialDashboardFilters,
    user: AnalyticsUser,
    projectType: string,
  ) => Promise<ManagerialDashboardCostByRegionData>;
  reportError?: (error: unknown) => void;
};

const facilityTypeSchema = z.object({ facilityType: z.string().trim().min(1).max(160) });

const defaultDependencies: CostByRegionRouteDependencies = {
  getCurrentUser: async () => (await getCurrentUser()) as AnalyticsUser | null,
  canViewAnalytics: (role) => hasPermission(role, "analytics", "view"),
  getCostByRegion: getRegionCostByType,
  reportError: () => console.error("Cost-by-region request failed"),
};

export function createCostByRegionGetHandler(
  dependencies: CostByRegionRouteDependencies = defaultDependencies,
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
      const { facilityType } = facilityTypeSchema.parse({
        facilityType: params.get("facilityType") ?? undefined,
      });
      const data = await dependencies.getCostByRegion(filters, user, facilityType);
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid cost-by-region request" },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      dependencies.reportError?.(error);
      return NextResponse.json(
        { error: "Unable to load cost-by-region breakdown" },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

export const GET = createCostByRegionGetHandler();
