import { getInfraAnalyticsData } from "@/actions/query/analytics.query";
import { LandingPageClient } from "./landing-page-client";

export const revalidate = 300;

export default async function LandingPage() {
  const analytics = await getInfraAnalyticsData();
  return <LandingPageClient initialAnalytics={analytics} />;
}