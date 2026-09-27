import type { Metadata } from "next";

import { getActiveLiveVideos } from "@/actions/query/live-videos.query";
import { LiveBroadcastsClient } from "@/components/live/live-broadcasts-client";

export const metadata: Metadata = {
  title: "Live Broadcasts | INFRA Watch",
  description: "Watch live and published INFRA Watch project monitoring broadcasts.",
};

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const videos = await getActiveLiveVideos();

  return (
    <div className="bg-slate-50 py-8 dark:bg-slate-900 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <LiveBroadcastsClient videos={videos} />
      </div>
    </div>
  );
}
