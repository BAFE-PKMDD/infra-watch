import type { Metadata } from "next";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { IssueManagementView } from "@/components/admin/issues/issue-management-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "E-Reports | INFRA Watch",
  description: "Review and respond to infrastructure concerns submitted through the online E-Report form.",
};

export default function IssuesPage() {
  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Reported Issues" }, { label: "E-Report" }]}
      title="E-Report"
      description="Review and respond to concerns submitted through the online reporting form."
    >
      <IssueManagementView />
    </AdminPageWrapper>
  );
}
