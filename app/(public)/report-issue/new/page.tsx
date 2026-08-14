import { Suspense } from "react";

import ReportIssueForm from "./report-issue-form";

export default function ReportIssuePage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen bg-slate-50 px-4 py-20 dark:bg-slate-950">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading the secure report form…
          </div>
        </main>
      )}
    >
      <ReportIssueForm />
    </Suspense>
  );
}
