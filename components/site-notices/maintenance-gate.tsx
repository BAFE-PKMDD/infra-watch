"use client";

import { usePathname } from "next/navigation";

import { shouldShowMaintenance } from "@/lib/site-notices";
import { useAuth } from "@/providers/auth-provider";
import { MaintenanceNotice } from "./maintenance-notice";
import { useSiteNotices } from "./use-site-notices";

/**
 * Covers the site with the maintenance notice for visitors and citizens while maintenance mode
 * is on. Staff and the sign-in screens are exempt (see lib/site-notices.ts). Mount once, in the
 * root layout, inside the auth and query providers.
 */
export function MaintenanceGate() {
  const { maintenance } = useSiteNotices();
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (!shouldShowMaintenance({ maintenance, authLoading: isLoading, role: user?.role, pathname })) {
    return null;
  }

  return <MaintenanceNotice />;
}
