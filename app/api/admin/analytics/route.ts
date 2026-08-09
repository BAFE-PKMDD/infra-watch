import { NextResponse } from "next/server";
import { z } from "zod";

import { parseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import {
  DashboardScopeTooLargeError,
  getManagerialDashboardData,
} from "@/lib/analytics/managerial-dashboard-query";
import { hasPermission } from "@/lib/permissions";
import type { ScopedUser } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import type { ManagerialDashboardData, ManagerialDashboardFilters } from "@/types/managerial-dashboard.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsUser = ScopedUser & { id?: string } & Record<string, unknown>;

type AnalyticsRouteDependencies = {
  getCurrentUser: () => Promise<AnalyticsUser | null>;
  canViewAnalytics: (role: string | null | undefined) => boolean;
  getDashboardData: (
    filters: ManagerialDashboardFilters,
    user: AnalyticsUser,
  ) => Promise<ManagerialDashboardData>;
  reportError?: (error: unknown) => void;
};

const defaultDependencies: AnalyticsRouteDependencies = {
  getCurrentUser: async () => (await getCurrentUser()) as AnalyticsUser | null,
  canViewAnalytics: (role) => hasPermission(role, "analytics", "view"),
  getDashboardData: getManagerialDashboardData,
  reportError: () => console.error("Managerial dashboard analytics request failed"),
};

export function createAnalyticsGetHandler(
  dependencies: AnalyticsRouteDependencies = defaultDependencies,
) {
  return async function GET(request: Request) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!dependencies.canViewAnalytics(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const filters = parseManagerialDashboardFilters(
        new URL(request.url).searchParams,
      );
      const data = await dependencies.getDashboardData(filters, user);
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid dashboard filters" },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      if (error instanceof DashboardScopeTooLargeError) {
        return NextResponse.json(
          { error: error.message },
          { status: 422, headers: { "Cache-Control": "private, no-store" } },
        );
      }

      dependencies.reportError?.(error);
      return NextResponse.json(
        { error: "Unable to load dashboard analytics" },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

export const GET = createAnalyticsGetHandler();
