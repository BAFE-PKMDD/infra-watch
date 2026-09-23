import Link from "next/link";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { CitizenEngagementDashboard } from "@/components/admin/analytics/citizen-engagement-dashboard";
import { Button } from "@/components/ui/button";
import {
  getCitizenEngagementAnalytics,
  parseCitizenAnalyticsRange,
} from "@/lib/analytics/citizen-engagement-query";
import { requireAdminOrRegionalAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CitizenEngagementPage({ searchParams }: PageProps) {
  await requireAdminOrRegionalAdmin();
  const params = await searchParams;
  const from = first(params.from);
  const to = first(params.to);
  const availableRange = parseCitizenAnalyticsRange({});

  let data: Awaited<ReturnType<typeof getCitizenEngagementAnalytics>> | undefined;
  let errorMessage: string | null = null;
  try {
    parseCitizenAnalyticsRange({ from, to });
  } catch {
    errorMessage = "Choose dates within the latest retained 90-day period.";
  }
  if (!errorMessage) {
    try {
      data = await getCitizenEngagementAnalytics({ from, to });
    } catch {
      console.error("Citizen engagement analytics query unavailable");
      errorMessage = "Citizen engagement analytics is temporarily unavailable. Please try again.";
    }
  }

  return (
    <AdminPageWrapper
      title="Citizen Engagement"
      description="Understand how people discover projects, use project maps, submit feedback, and report common issues without storing search text or persistent visitor identifiers."
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Citizen Engagement" }]}
    >
      <div className="space-y-6">
        <form method="get" className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-900">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            From
            <input name="from" type="date" required min={availableRange.earliestAvailable} max={availableRange.to} defaultValue={data?.range.from ?? from ?? ""} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            To
            <input name="to" type="date" required min={availableRange.earliestAvailable} max={availableRange.to} defaultValue={data?.range.to ?? to ?? ""} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11">Apply dates</Button>
            <Button asChild type="button" variant="outline" className="min-h-11"><Link href="/reports/citizen-engagement">Last 30 days</Link></Button>
          </div>
          <p className="text-xs leading-5 text-slate-500 sm:ml-auto sm:max-w-xs sm:text-right dark:text-slate-400">Inclusive calendar dates · maximum 90 days · Asia/Manila</p>
        </form>

        {errorMessage ? (
          <div role="alert" className="border-l-4 border-red-500 bg-red-50 px-4 py-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
            <p className="font-semibold">Unable to load this report</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        ) : data ? <CitizenEngagementDashboard data={data} /> : null}
      </div>
    </AdminPageWrapper>
  );
}
