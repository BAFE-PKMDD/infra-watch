import type { Metadata } from "next";

import { getActiveLiveVideos } from "@/actions/query/live-videos.query";
import { LiveBroadcastsClient } from "@/components/live/live-broadcasts-client";
import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("site.live.meta.title"),
    description: t("site.live.meta.description"),
  };
}

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
