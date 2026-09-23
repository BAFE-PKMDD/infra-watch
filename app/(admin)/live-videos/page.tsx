import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle, Radio, Star, Video } from "lucide-react";

import { getAllLiveVideos, getLiveVideoStats } from "@/actions/query/live-videos.query";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { LiveVideoTable } from "@/components/admin/live-videos/live-video-table";
import { StatCard } from "@/components/admin/shared/stat-card";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { requireAdminOrRegionalAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Live Videos | INFRA Watch Admin",
  description: "Manage public livestream embeds and broadcast notices.",
};

export default async function LiveVideosPage() {
  await requireAdminOrRegionalAdmin();

  const [videos, stats] = await Promise.all([
    getAllLiveVideos(),
    getLiveVideoStats(),
  ]);

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "System" }, { label: "Live Videos" }]}
      title="Live Videos"
      description="Publish Facebook and YouTube broadcasts and replays in the public INFRA Watch portal."
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 sm:gap-6">
          <StatCard
            title="Total Videos"
            value={stats.total}
            icon={Video}
            iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={CheckCircle}
            iconColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            title="Currently Live"
            value={stats.live}
            icon={Radio}
            iconColor="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          />
          <StatCard
            title="Featured"
            value={stats.featured}
            icon={Star}
            iconColor="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
          />
        </div>

        {/* Table */}
        <Suspense fallback={<TableSkeleton columnCount={6} />}>
          <LiveVideoTable videos={videos} />
        </Suspense>
      </div>
    </AdminPageWrapper>
  );
}
