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
      <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-red-600">INFRA Watch Live</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Live broadcasts and project updates</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">Follow official field monitoring broadcasts and watch published replays directly in the transparency portal.</p>
        </div>
        <LiveBroadcastsClient videos={videos} />
      </div>
    </div>
  );
}
