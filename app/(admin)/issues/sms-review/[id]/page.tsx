import type { Metadata } from "next";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceDetailView } from "@/components/admin/issues/sms-grievance-detail-view";
import { getSmsGrievanceQueue } from "@/lib/sms-grievance/live-source";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS Grievance | INFRA Watch",
  description: "Review a single SMS grievance message and decide the next action.",
};

export default async function SmsReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { records, dataSource, liveFetchError } = await getSmsGrievanceQueue();

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "SMS Grievance" }]}
      title="SMS Grievance"
      description="Review this message, confirm the matching project, and decide the next action."
    >
      <SmsGrievanceDetailView id={id} initialRecords={records} dataSource={dataSource} liveFetchError={liveFetchError} />
    </AdminPageWrapper>
  );
}
