import { requireStaffApi } from "@/lib/staff-api";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { CommentModeration } from "@/components/admin/operations/comment-moderation";
export default async function Page() {
  await requireStaffApi();
  return (
    <AdminPageWrapper
      title="Comment Moderation"
      description="Review individual discussion comments and attached media within your assigned project scope."
      breadcrumbs={[{ label: "Admin" }, { label: "Comment Moderation" }]}
    >
      <CommentModeration />
    </AdminPageWrapper>
  );
}
