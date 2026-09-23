import { NextResponse } from "next/server";

import {
  getCitizenEngagementAnalytics,
  type CitizenEngagementAnalytics,
} from "@/lib/analytics/citizen-engagement-query";
import { requireAdminOrRegionalAdmin } from "@/lib/session";

export const runtime = "nodejs";

type Dependencies = {
  authorize: () => Promise<unknown>;
  loadAnalytics: (range: { from?: string | null; to?: string | null }) => Promise<CitizenEngagementAnalytics>;
};

const defaultDependencies: Dependencies = {
  authorize: requireAdminOrRegionalAdmin,
  loadAnalytics: getCitizenEngagementAnalytics,
};

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  if (/date|range|90 days|before/i.test(message)) return 400;
  return 500;
}

export function createCitizenEngagementAnalyticsGetHandler(
  dependencies: Dependencies = defaultDependencies,
) {
  return async function GET(request: Request) {
    try {
      await dependencies.authorize();
      const url = new URL(request.url);
      const data = await dependencies.loadAnalytics({
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
      });
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const status = errorStatus(error);
      if (status === 500) console.error("Failed to load citizen engagement analytics");
      return NextResponse.json(
        { success: false, error: status === 500 ? "Failed to load analytics" : (error as Error).message },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}

export const GET = createCitizenEngagementAnalyticsGetHandler();
