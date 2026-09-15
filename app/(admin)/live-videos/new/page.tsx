import type { Metadata } from "next";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { LiveVideoForm } from "@/components/admin/live-videos/live-video-form";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Add Video | INFRA Watch Admin",
  description: "Add a Facebook or YouTube video to INFRA Watch.",
};

export default async function NewLiveVideoPage() {
  await requireAdmin();

  return (
    <AdminPageWrapper
      breadcrumbs={[
        { label: "Admin" },
        { label: "System" },
        { label: "Live Videos" },
        { label: "New" },
      ]}
      title="Add Video"
      description="Add a Facebook or YouTube video or broadcast notice"
    >
      <LiveVideoForm />
    </AdminPageWrapper>
  );
}
