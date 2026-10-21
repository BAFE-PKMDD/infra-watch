import { requireAdmin } from "@/lib/session";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { RegionalStatistics } from "@/components/admin/operations/regional-statistics";
export default async function Page() {
  await requireAdmin();
  return (
    <AdminPageWrapper
      title="Regional Statistics"
      description="Maintain sourced regional figures for AMEFIP and INS, with explicit publication status."
      breadcrumbs={[{ label: "Admin" }, { label: "Regional Statistics" }]}
    >
      <RegionalStatistics editable />
    </AdminPageWrapper>
  );
}
