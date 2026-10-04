import type React from "react";
import { redirect } from "next/navigation";

import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { TourProvider } from "@/components/admin/tour/tour-provider";
import { AniaAssistant } from "@/components/voice/ania-assistant";
import { canAccessAdmin, getSession } from "@/lib/session";
import { getVoiceAssistantConfig } from "@/lib/voice/config";

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
  const region = typeof session.user.region === "string" ? session.user.region : null;
  const assignedAgency = typeof session.user.assignedAgency === "string" ? session.user.assignedAgency : null;
  const voiceConfig = getVoiceAssistantConfig();

  return (
    <TourProvider key={session.user.id} userId={session.user.id} role={role} region={region} assignedAgency={assignedAgency}>
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="flex min-h-screen">
          <AdminSidebar role={role} region={region} assignedAgency={assignedAgency} />
          <div className="min-w-0 flex-1">
            <AdminMobileNav role={role} region={region} assignedAgency={assignedAgency} />
            <main>{children}</main>
          </div>
        </div>
        {role === "admin" && voiceConfig.enabled && <AniaAssistant config={voiceConfig} />}
      </div>
    </TourProvider>
  );
}
