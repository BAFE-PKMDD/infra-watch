import { requireAdmin } from "@/lib/session";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { LocationSync } from "@/components/admin/operations/location-sync";
export default async function Page() {
  await requireAdmin();
  return (
    <AdminPageWrapper
      title="Location Sync"
      description="Synchronize PSGC reference locations and inspect completed source runs."
      breadcrumbs={[{ label: "Admin" }, { label: "Location Sync" }]}
    >
      <LocationSync />
    </AdminPageWrapper>
  );
}
