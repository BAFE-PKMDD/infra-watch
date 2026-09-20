import type { Metadata } from "next";

import { IssueDetailAdminView } from "@/components/admin/issues/issue-detail-admin-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review E-Report | INFRA Watch",
  description: "Review an E-Report, check its evidence, and record the next action.",
};

export default async function AdminIssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueDetailAdminView issueId={id} />;
}
