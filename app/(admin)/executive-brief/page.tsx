import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ExecutiveBriefClient } from "@/components/admin/dashboard/executive-brief-client";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Infrastructure Analytics Executive Brief",
  description: "Generate a decision-focused brief from the current authorized infrastructure dashboard scope.",
  robots: { index: false, follow: false },
};

export default async function ExecutiveBriefPage() {
  await connection();
  const enabled = process.env.ENABLE_MANAGERIAL_AI === "true";

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "Analytics" }, { label: "Executive Brief" }]}
      title="Infrastructure Analytics Executive Brief"
      description="Generate, review, and download a decision-focused brief from the current authorized dashboard scope."
    >
      {enabled ? (
        <Suspense
          fallback={
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Loading executive brief workspace…
            </div>
          }
        >
          <ExecutiveBriefClient />
        </Suspense>
      ) : (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            The Managerial AI feature is currently disabled. Enable it before generating an executive brief.
          </p>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Infrastructure Analytics Dashboard</Link>
          </Button>
        </div>
      )}
    </AdminPageWrapper>
  );
}
