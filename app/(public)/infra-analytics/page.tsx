import type { Metadata } from "next";
import type { ReactNode } from "react";

import { publicAnalyticsFontClassName } from "@/components/public-analytics/fonts";
import { PublicAnalyticsView } from "@/components/public-analytics/public-analytics-view";
import { parseFilters } from "@/lib/public-analytics/aggregate";
import { getPublicProjectSnapshot } from "@/lib/public-analytics/service";
import { publicAnalyticsStrings as S } from "@/lib/public-analytics/strings";
import { buildDashboard } from "@/lib/public-analytics/views";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Farm infrastructure built with public funds | InfraWatch",
  description: "What BAFE has built for farmers and fishers, how much it cost, and whether it is finished.",
};

export default async function InfraAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const t = S.en;

  let dashboard: ReturnType<typeof buildDashboard> | null = null;
  let state: "ready" | "empty" | "unavailable" = "ready";
  try {
    const { rows, dataAsOf } = await getPublicProjectSnapshot();
    if (rows.length === 0) state = "empty";
    else dashboard = buildDashboard(rows, filters, dataAsOf);
  } catch (error) {
    console.error("Public analytics page failed", error);
    state = "unavailable";
  }

  const content: ReactNode = dashboard
    ? <PublicAnalyticsView dashboard={dashboard} />
    : state === "empty"
      ? <p role="status" className="mx-auto max-w-3xl px-4 py-16 text-center text-base text-pa-ink-2">{t.page.noData}</p>
      : <p role="alert" className="mx-auto max-w-3xl px-4 py-16 text-center text-base text-pa-ink-2">{t.page.unavailable}</p>;

  return <div className={`public-analytics ${publicAnalyticsFontClassName} min-h-screen`}>{content}</div>;
}
