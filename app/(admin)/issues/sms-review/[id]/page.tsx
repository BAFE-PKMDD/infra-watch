import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceDetailView } from "@/components/admin/issues/sms-grievance-detail-view";
import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS Grievance | INFRA Watch",
  description: "Review a single SMS grievance message and decide the next action.",
};

export default async function SmsReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { id } = await params;

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "SMS Grievance" }]}
      title="SMS Grievance"
      description="Review this message, confirm the matching project, and decide the next action."
    >
      <SmsGrievanceDetailView id={id} initialRecords={SMS_MOCK_SCENARIOS} />
    </AdminPageWrapper>
  );
}
