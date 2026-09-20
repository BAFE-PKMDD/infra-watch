import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceTable } from "@/components/admin/issues/sms-grievance-table";
import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS Grievance Prototype | INFRA Watch",
  description: "Development-only workspace for reviewing sample SMS grievance messages.",
};

export default function SmsReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "SMS Grievance" }]}
      title="SMS Grievance"
      description="Try the review flow with sample messages. No SMS service is connected, and nothing on this page sends a real message."
    >
      <SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />
    </AdminPageWrapper>
  );
}
