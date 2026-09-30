import type { Metadata } from "next";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SmsGrievanceTable } from "@/components/admin/issues/sms-grievance-table";
import { getSmsGrievanceQueue } from "@/lib/sms-grievance/live-source";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS Grievance | INFRA Watch",
  description: "Review incoming SMS grievance messages and route each one to the right team.",
};

export default async function SmsReviewPage() {
  const { records, dataSource, liveFetchError } = await getSmsGrievanceQueue();

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "SMS Grievance" }]}
      title="SMS Grievance"
      description="Review each message, confirm whether it belongs in InfraWatch, and route it to the right team."
    >
      <SmsGrievanceTable initialRecords={records} dataSource={dataSource} liveFetchError={liveFetchError} />
    </AdminPageWrapper>
  );
}
