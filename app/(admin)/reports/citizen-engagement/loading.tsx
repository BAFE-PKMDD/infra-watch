import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export default function CitizenEngagementLoading() {
  return (
    <AdminPageWrapper
      title="Citizen Engagement"
      description="Loading citizen engagement activity…"
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Citizen Engagement" }]}
    >
      <div role="status" aria-live="polite" className="space-y-5">
        <span className="sr-only">Loading citizen engagement report</span>
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </AdminPageWrapper>
  );
}
