import type { Metadata } from "next";
import type { ReactNode } from "react";

import { publicAnalyticsFontClassName } from "@/components/public-analytics/fonts";
import { PublicAnalyticsView } from "@/components/public-analytics/public-analytics-view";
import { getServerLanguage } from "@/i18n/server";
import { parseFilters } from "@/lib/public-analytics/aggregate";
import { getPublicProjectSnapshot } from "@/lib/public-analytics/service";
import { getPublicAnalyticsStrings } from "@/lib/public-analytics/strings";
import { buildDashboard } from "@/lib/public-analytics/views";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = getPublicAnalyticsStrings(await getServerLanguage());
  return {
    title: `${t.page.title} | InfraWatch`,
    description: t.page.metaDescription,
  };
}

export default async function InfraAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, language] = await Promise.all([searchParams, getServerLanguage()]);
  const filters = parseFilters(params);
  const t = getPublicAnalyticsStrings(language);

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
    ? <PublicAnalyticsView dashboard={dashboard} t={t} />
    : state === "empty"
      ? <p role="status" className="mx-auto max-w-3xl px-4 py-16 text-center text-base text-pa-ink-2">{t.page.noData}</p>
      : <p role="alert" className="mx-auto max-w-3xl px-4 py-16 text-center text-base text-pa-ink-2">{t.page.unavailable}</p>;

  return <div className={`public-analytics ${publicAnalyticsFontClassName} min-h-screen`}>{content}</div>;
}
