"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { reportSiteVisit } from "@/lib/analytics/site-visit-client";

/**
 * Reports one anonymous `site_visit` per browser session, from whichever page the visitor
 * loads first. Mount it once per layout; later page loads in the same session send nothing.
 * Failures are swallowed so analytics can never affect the page.
 */
export function SiteVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    void reportSiteVisit(pathname ?? "/");
  }, [pathname]);
  return null;
}
