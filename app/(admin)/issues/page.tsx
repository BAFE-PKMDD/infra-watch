import type { Metadata } from "next";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { IssueManagementView } from "@/components/admin/issues/issue-management-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Issue Management | INFRA Watch",
  description: "Manage and respond to citizen-reported infrastructure issues.",
};

export default function IssuesPage() {
  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Issues" }]}
      title="Issue Management"
      description="Manage and respond to reported issues."
    >
      <IssueManagementView />
    </AdminPageWrapper>
  );
}
