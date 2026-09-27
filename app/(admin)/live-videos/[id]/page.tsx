import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLiveVideoById } from "@/actions/query/live-videos.query";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { LiveVideoForm } from "@/components/admin/live-videos/live-video-form";
import { requireAdminOrRegionalAdmin } from "@/lib/session";
import { canReviewLiveVideos } from "@/lib/live-video-approval";

export const metadata: Metadata = {
  title: "Edit Video | INFRA Watch Admin",
  description: "Edit a Facebook or YouTube video entry.",
};

export default async function EditLiveVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdminOrRegionalAdmin();
  const { id } = await params;

  const video = await getLiveVideoById(id);
  if (!video) {
    notFound();
  }

  return (
    <AdminPageWrapper
      breadcrumbs={[
        { label: "Admin" },
        { label: "System" },
        { label: "Live Videos" },
        { label: "Edit" },
      ]}
      title="Edit Video"
      description="Update live video broadcast details"
    >
      <LiveVideoForm initialData={video} userRegion={user.region} canReview={canReviewLiveVideos(user)} />
    </AdminPageWrapper>
  );
}
