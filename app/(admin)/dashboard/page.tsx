import { connection } from "next/server";
import { Suspense } from "react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { DashboardSkeleton } from "@/components/admin/dashboard/dashboard-skeleton";
import { ManagerialDashboardClient } from "@/components/admin/dashboard/managerial-dashboard-client";

export const DASHBOARD_TITLE = "Infrastructure Monitoring";

export default async function DashboardPage() {
  await connection();
  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Analytics" }]}
      title={DASHBOARD_TITLE}
      description="Monitor project status, budget utilization, and regional performance."
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <ManagerialDashboardClient
          managerialAiEnabled={process.env.ENABLE_MANAGERIAL_AI === "true"}
        />
      </Suspense>
    </AdminPageWrapper>
  );
}
