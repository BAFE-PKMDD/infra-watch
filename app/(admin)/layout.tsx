import type React from "react";
import { redirect } from "next/navigation";

import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { canAccessAdmin, getSession } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/dashboard")}`);
  }

  const allowed = await canAccessAdmin();

  if (!allowed) {
    redirect("/");
  }

  const role = typeof session.user.role === "string" ? session.user.role : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen">
        <AdminSidebar role={role} />
        <div className="min-w-0 flex-1">
          <AdminMobileNav role={role} />
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
