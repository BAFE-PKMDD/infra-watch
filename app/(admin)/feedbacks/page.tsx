import type { Metadata } from "next";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { FeedbackManagementView } from "@/components/admin/feedback/feedback-management-view";
import { getAllFeedback, getFeedbackStats } from "@/actions/query/feedback.query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feedback Moderation | INFRA Watch",
  description: "Review, approve, reject, and delete citizen feedback submissions.",
};

export default async function FeedbacksPage() {
  const [statsResult, feedbackResult] = await Promise.all([
    getFeedbackStats(),
    getAllFeedback({ page: 1, limit: 10, status: "all" }),
  ]);

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Feedbacks" }]}
      title="Feedback Moderation"
      description="Review citizen feedback and control which submissions appear on public project pages."
    >
      <FeedbackManagementView
        initialData={{
          feedbacks: feedbackResult.success ? feedbackResult.data : [],
          stats: statsResult.success
            ? statsResult.data
            : {
              total: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              averageRating: 0,
            },
          pagination: feedbackResult.success
            ? feedbackResult.pagination
            : {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            },
        }}
      />
    </AdminPageWrapper>
  );
}
