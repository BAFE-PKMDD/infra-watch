import type { Metadata } from "next";

import { IssueDetailAdminView } from "@/components/admin/issues/issue-detail-admin-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Issue Details | INFRA Watch",
  description: "View and respond to a citizen-reported issue.",
};

export default async function AdminIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueDetailAdminView issueId={id} />;
}
