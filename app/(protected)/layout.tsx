import React from "react";
import { redirect } from "next/navigation";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { getSession } from "@/lib/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/projects")}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader activeItem="projects" />
      <main className="flex-1 bg-slate-50 dark:bg-slate-950">{children}</main>
      <AppFooter />
    </div>
  );
}