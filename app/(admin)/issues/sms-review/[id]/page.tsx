import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceDetailView } from "@/components/admin/issues/sms-grievance-detail-view";
import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS Grievance Sample | INFRA Watch",
  description: "Development-only workspace for reviewing one sample SMS grievance message.",
};

export default async function SmsReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "SMS Grievance" }]}
      title="SMS Grievance sample"
      description="Try the review flow with a sample message. No SMS service is connected, and nothing on this page sends a real message."
    >
      <SmsGrievanceDetailView id={id} initialRecords={SMS_MOCK_SCENARIOS} />
    </AdminPageWrapper>
  );
}
