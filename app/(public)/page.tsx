import { getInfraAnalyticsData } from "@/actions/query/analytics.query";
import { getCurrentLiveVideo } from "@/actions/query/live-videos.query";
import { LandingPageClient } from "./landing-page-client";

export const revalidate = 300;

export default async function LandingPage() {
  const [analytics, liveVideo] = await Promise.all([
    getInfraAnalyticsData(),
    getCurrentLiveVideo(),
  ]);
  return <LandingPageClient initialAnalytics={analytics} liveVideo={liveVideo} />;
}
