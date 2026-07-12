import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { ArrowLeft, MessageSquare } from "lucide-react";

export default function MyIssueDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AppHeader activeItem="home" />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex animate-pulse items-center gap-2">
          <ArrowLeft className="h-4 w-4 text-slate-400" />
          <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="mb-6 animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-7 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-28 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="mb-4 h-8 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-5 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-full rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-400" />
            <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
