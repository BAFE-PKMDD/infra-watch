import { Suspense } from "react";
import { requireAdminOrRegionalAdmin } from "@/lib/session";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ContactReport } from "@/components/admin/operations/contact-report";
export default async function Page() {
  const actor = await requireAdminOrRegionalAdmin();
  return (
    <AdminPageWrapper
      title="Contact Response Reports"
      description="Measure staff response times using delivered reply history."
      breadcrumbs={[{ label: "Reports" }, { label: "Contact" }]}
    >
      <Suspense fallback={<p role="status">Loading contact report…</p>}>
        <ContactReport userId={actor.id} />
      </Suspense>
    </AdminPageWrapper>
  );
}
