import { NextResponse } from "next/server";

import { getBannerSettings, getMaintenanceMode } from "@/actions/query/settings.query";
import type { SiteNotices } from "@/lib/site-notices";

// Read on every call: an admin switching maintenance on should reach visitors within a minute.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Public site-wide notices: maintenance mode and the optional banner.
 * Returns only what the visitor needs to render them. Fails open (no notices) if the
 * settings can't be read, so a database hiccup never locks the whole site.
 */
export async function GET() {
  const [maintenance, banner] = await Promise.all([getMaintenanceMode(), getBannerSettings()]);

  const body: SiteNotices = {
    maintenance: maintenance.success && maintenance.data,
    banner: banner.success && banner.data.isEnabled ? banner.data : null,
  };

  return NextResponse.json(body, { headers: NO_STORE });
}
