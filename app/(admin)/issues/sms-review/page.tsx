import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceTable } from "@/components/admin/issues/sms-grievance-table";
import { SMS_MOCK_SCENARIOS } from "@/lib/sms-grievance/mock-fixtures";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS Grievance | INFRA Watch",
  description: "Review incoming SMS grievance messages and route each one to the right team.",
};

export default function SmsReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "SMS Grievance" }]}
      title="SMS Grievance"
      description="Review each message, confirm whether it belongs in InfraWatch, and route it to the right team."
    >
      <SmsGrievanceTable initialRecords={SMS_MOCK_SCENARIOS} />
    </AdminPageWrapper>
  );
}
