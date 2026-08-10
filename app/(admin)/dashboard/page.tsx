import { connection } from "next/server";
import { Suspense } from "react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { DashboardSkeleton } from "@/components/admin/dashboard/dashboard-skeleton";
import { ManagerialDashboardClient } from "@/components/admin/dashboard/managerial-dashboard-client";

export const DASHBOARD_TITLE = "Infrastructure Analytics Dashboard";

export default async function DashboardPage() {
  await connection();
  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Analytics" }]}
      title={DASHBOARD_TITLE}
      description="Interactive portfolio intelligence for project performance, schedule risk, budget oversight, and regional delivery—designed to support executive decisions and surface bottlenecks early."
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <ManagerialDashboardClient
          managerialAiEnabled={process.env.ENABLE_MANAGERIAL_AI === "true"}
        />
      </Suspense>
    </AdminPageWrapper>
  );
}
