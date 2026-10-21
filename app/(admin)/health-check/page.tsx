import { requireAdmin } from "@/lib/session";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ServiceHealth } from "@/components/admin/operations/service-health";
export default async function Page() {
  await requireAdmin();
  return (
    <AdminPageWrapper
      title="System Health"
      description="Check application services, background processing, and public-data caching."
      breadcrumbs={[{ label: "Admin" }, { label: "System Health" }]}
    >
      <ServiceHealth />
    </AdminPageWrapper>
  );
}
