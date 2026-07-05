import type { Metadata } from "next";
import type React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Flag,
  ShieldCheck,
} from "lucide-react";

import { updateChecklistItemStatus } from "@/actions/mutation/checklist.mutation";
import {
  checklistStatusLabels,
  checklistStatusOptions,
  type ChecklistItemStatus,
  getChecklistDashboardData,
} from "@/lib/checklists";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checklist Workspace - INFRA Watch",
  description: "Phased infrastructure monitoring checklist workspace.",
};

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusStyles: Record<ChecklistItemStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-650 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  needs_review: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  blocked: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
};

const phaseAccent: Record<string, string> = {
  planning: "bg-slate-700 dark:bg-slate-300",
  validation: "bg-blue-600",
  implementation: "bg-primary",
  inspection: "bg-amber-500",
  completion: "bg-emerald-600",
};

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "No due date";
}

function statusBadgeClass(status: ChecklistItemStatus) {
  return statusStyles[status] ?? statusStyles.pending;
}

export default async function ChecklistsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const data = await getChecklistDashboardData();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-primary-foreground">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Phase 2 workspace
          </div>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Phased checklist control center
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Planning, validation, implementation, inspection, and completion controls for AMEFIP infrastructure monitoring.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name ?? user?.email ?? "Signed-in user"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role ?? "citizen"} access</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Overall" value={`${data.stats.completionPercent}%`} detail="Completion" icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard label="Checklists" value={data.stats.totalChecklists} detail="Active projects" icon={<ClipboardCheck className="h-4 w-4" />} />
        <MetricCard label="Items" value={`${data.stats.completedItems}/${data.stats.totalItems}`} detail="Completed" icon={<FileCheck2 className="h-4 w-4" />} />
        <MetricCard label="Review" value={data.stats.needsReviewItems} detail="Needs review" icon={<Clock3 className="h-4 w-4" />} />
        <MetricCard label="Risk" value={data.stats.blockedItems} detail="Blocked items" icon={<AlertTriangle className="h-4 w-4" />} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Phase Progress</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gate completion across all seeded project checklists.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            {data.stats.dueSoon} due in 14 days
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {data.phaseSummaries.map((phase) => (
            <div key={phase.code} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-950 dark:text-white">{phase.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{phase.gateLabel}</p>
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{phase.completionPercent}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full ${phaseAccent[phase.code] ?? "bg-primary"}`} style={{ width: `${phase.completionPercent}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{phase.completed}/{phase.total} complete</span>
                <span>{phase.blocked} blocked</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">Project Checklists</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Status can be updated directly from each checklist row.</p>
        </div>

        <div className="space-y-5">
          {data.checklists.map((checklist) => (
            <article key={checklist.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-4 border-b border-slate-100 p-5 dark:border-slate-800 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {checklist.projectCode}
                    </span>
                    {checklist.currentPhase && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/5 px-2 py-1 text-[11px] font-bold text-primary dark:border-primary/30 dark:bg-primary/15">
                        <Flag className="h-3 w-3" />
                        {checklist.currentPhase.name}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">{checklist.projectName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{checklist.projectLocation}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px]">
                  <SmallStat label="Complete" value={`${checklist.completionPercent}%`} />
                  <SmallStat label="Due" value={formatDate(checklist.dueDate)} />
                  <SmallStat label="Blocked" value={checklist.statusCounts.blocked} />
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {checklist.items.map((item) => (
                  <form key={item.id} action={updateChecklistItemStatus} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_160px_minmax(180px,260px)_72px] lg:items-center">
                    <input type="hidden" name="itemId" value={item.id} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold ${statusBadgeClass(item.status)}`}>
                          {checklistStatusLabels[item.status]}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.phaseName}</span>
                        {item.evidenceRequired && <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">Evidence</span>}
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                      {item.description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>}
                    </div>

                    <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                      Status
                      <select
                        name="status"
                        defaultValue={item.status}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {checklistStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {checklistStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                      Remarks
                      <input
                        name="remarks"
                        defaultValue={item.remarks ?? ""}
                        placeholder="Optional note"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>

                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-primary px-3 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      Save
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-primary dark:bg-slate-800">
          {icon}
        </div>
        <CircleDashed className="h-4 w-4 text-slate-300 dark:text-slate-700" />
      </div>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-extrabold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}