import { NextResponse } from "next/server";
import { z } from "zod";

import { parseManagerialDashboardFilters } from "@/lib/analytics/dashboard-filters";
import { getManagerialDashboardDrillthrough } from "@/lib/analytics/managerial-dashboard-query";
import { hasPermission } from "@/lib/permissions";
import { hasAssignedModeratorScope, type ScopedUser } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import type {
  ManagerialDashboardDrillthroughData,
  ManagerialDashboardFilters,
} from "@/types/managerial-dashboard.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnalyticsUser = ScopedUser & { id?: string } & Record<string, unknown>;
type Pagination = { page: number; pageSize: number };
type DrillthroughOptions = { otherProjectTypes?: { excluded: string[] } };

type DrillthroughRouteDependencies = {
  getCurrentUser: () => Promise<AnalyticsUser | null>;
  canViewAnalytics: (role: string | null | undefined) => boolean;
  getDrillthroughData: (
    filters: ManagerialDashboardFilters,
    user: AnalyticsUser,
    pagination: Pagination,
    options?: DrillthroughOptions,
  ) => Promise<ManagerialDashboardDrillthroughData>;
  reportError?: (error: unknown) => void;
};

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
});

const groupSchema = z.object({
  group: z.enum(["otherProjectTypes"]).optional(),
  excluded: z.array(z.string().trim().min(1).max(100)).max(8),
}).superRefine((value, context) => {
  if ((value.group && value.excluded.length === 0) || (!value.group && value.excluded.length > 0)) {
    context.addIssue({ code: "custom", message: "A project-type group and its exclusions must be provided together." });
  }
});

const defaultDependencies: DrillthroughRouteDependencies = {
  getCurrentUser: async () => (await getCurrentUser()) as AnalyticsUser | null,
  canViewAnalytics: (role) => hasPermission(role, "analytics", "view"),
  getDrillthroughData: getManagerialDashboardDrillthrough,
  reportError: () => console.error("Dashboard drill-through request failed"),
};

export function createAnalyticsDrillthroughGetHandler(
  dependencies: DrillthroughRouteDependencies = defaultDependencies,
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
      const pagination = paginationSchema.parse({
        page: params.get("page") ?? undefined,
        pageSize: params.get("pageSize") ?? undefined,
      });
      const group = groupSchema.parse({
        group: params.get("projectTypeGroup") ?? undefined,
        excluded: params.getAll("excludeProjectType"),
      });
      const options: DrillthroughOptions | undefined = group.group
        ? { otherProjectTypes: { excluded: group.excluded } }
        : undefined;
      const data = await dependencies.getDrillthroughData(filters, user, pagination, options);
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid drill-through request" },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      dependencies.reportError?.(error);
      return NextResponse.json(
        { error: "Unable to load project details" },
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

export const GET = createAnalyticsDrillthroughGetHandler();
