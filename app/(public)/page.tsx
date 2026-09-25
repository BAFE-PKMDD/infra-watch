import { getInfraAnalyticsData } from "@/actions/query/analytics.query";
import { getActivityFeed } from "@/actions/query/activity-feed.query";
import { getCurrentLiveVideo } from "@/actions/query/live-videos.query";
import { getPhilippineProvincesGeoJson } from "@/lib/ph-provinces-geojson";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";
import { LandingPageClient } from "./landing-page-client";

export const revalidate = 300;

export default async function LandingPage() {
  const [analytics, liveVideo, feedbackFeed, provincesMap] = await Promise.all([
    getInfraAnalyticsData(),
    getCurrentLiveVideo(),
    getActivityFeed({ type: "feedback", limit: 12, sort: "newest" }),
    getPhilippineProvincesGeoJson(),
  ]);
  const feedbackHighlights = feedbackFeed.data.filter(
    (item): item is FeedbackActivityItem => item.type === "feedback",
  );
  return (
    <LandingPageClient
      initialAnalytics={analytics}
      liveVideo={liveVideo}
      feedbackHighlights={feedbackHighlights}
      provincesMap={provincesMap}
    />
  );
}
