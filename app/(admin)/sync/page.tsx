import { requireAdmin } from "@/lib/session";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { JobMonitor } from "@/components/admin/operations/job-monitor";
export default async function Page() {
  await requireAdmin();
  return <AdminPageWrapper title="ABEMIS Sync" description="Synchronize AMEFIP and INS project records into the local InfraWatch read model." breadcrumbs={[{ label: "Admin" }, { label: "ABEMIS Sync" }]}><JobMonitor kind="abemis-sync" /></AdminPageWrapper>;
}
