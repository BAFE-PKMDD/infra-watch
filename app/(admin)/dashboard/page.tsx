import { Activity, ClipboardCheck, Database, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { getAdminProjectStats, getSyncStatistics } from "@/lib/abemis/sync";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [projectStats, syncStats] = await Promise.all([getAdminProjectStats(user ?? undefined), getSyncStatistics()]);

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
      title="Operations Dashboard"
      description="Monitor the local ABEMIS read model and the InfraWatch modules built around synced AMEFIP and INS projects."
    >
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Synced projects" value={projectStats.total.toLocaleString()} icon={<Database className="size-4" />} />
        <Metric label="Ongoing" value={projectStats.ongoing.toLocaleString()} icon={<Activity className="size-4" />} />
        <Metric label="Completed" value={projectStats.completed.toLocaleString()} icon={<ClipboardCheck className="size-4" />} />
        <Metric
          label="Last sync"
          value={syncStats.lastSync ? new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(syncStats.lastSync.syncedAt)) : "Never"}
          icon={<RefreshCw className="size-4" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">ABEMIS Read Model</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Projects are synchronized from ABEMIS and treated as read-only source records. InfraWatch data such as reports and feedback attaches to those synced IDs.
              </p>
            </div>
            <Link
              href="/sync"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-bold text-white hover:bg-primary/90"
            >
              Sync
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">Project Catalog</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Admin project management is a searchable catalog of synced ABEMIS records. No manual project creation is exposed in this flow.
              </p>
            </div>
            <Link
              href="/admin-projects"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Open
            </Link>
          </div>
        </div>
      </section>
    </AdminPageWrapper>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
