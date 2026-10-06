import { getInfraAnalyticsData } from "@/actions/query/analytics.query";
import { getActivityFeed } from "@/actions/query/activity-feed.query";
import { getCurrentLiveVideos } from "@/actions/query/live-videos.query";
import { getPhilippineProvincesGeoJson } from "@/lib/ph-provinces-geojson";
import type { FeedbackActivityItem } from "@/types/activity-feed.types";
import { LandingPageClient } from "./landing-page-client";

export const revalidate = 300;

export default async function LandingPage() {
  const [analytics, liveVideos, feedbackFeed, provincesMap] = await Promise.all([
    getInfraAnalyticsData(),
    getCurrentLiveVideos(),
    getActivityFeed({ type: "feedback", limit: 12, sort: "newest" }),
    getPhilippineProvincesGeoJson(),
  ]);
  const feedbackHighlights = feedbackFeed.data.filter(
    (item): item is FeedbackActivityItem => item.type === "feedback",
  );
  return (
    <LandingPageClient
      initialAnalytics={analytics}
      liveVideos={liveVideos}
      feedbackHighlights={feedbackHighlights}
      provincesMap={provincesMap}
    />
  );
}
