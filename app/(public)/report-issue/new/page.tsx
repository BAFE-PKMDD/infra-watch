import { Suspense } from "react";

import { getServerTranslator } from "@/i18n/server";

import ReportIssueForm from "./report-issue-form";

export default async function ReportIssuePage() {
  const { t } = await getServerTranslator();

  return (
    <Suspense
      fallback={(
        <main className="min-h-screen bg-slate-50 px-4 py-20 dark:bg-slate-950">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {t("eReport.form.loading")}
          </div>
        </main>
      )}
    >
      <ReportIssueForm />
    </Suspense>
  );
}
