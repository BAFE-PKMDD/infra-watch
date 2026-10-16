"use client";

import { useQuery } from "@tanstack/react-query";

import { SITE_NOTICES_ENDPOINT, SITE_NOTICES_QUERY_KEY, type SiteNotices } from "@/lib/site-notices";

const NO_NOTICES: SiteNotices = { maintenance: false, banner: null };

async function fetchSiteNotices(): Promise<SiteNotices> {
  const response = await fetch(SITE_NOTICES_ENDPOINT, { cache: "no-store" });
  if (!response.ok) return NO_NOTICES;
  const data = (await response.json()) as Partial<SiteNotices>;
  return { maintenance: data.maintenance === true, banner: data.banner ?? null };
}

/**
 * Maintenance and banner state for the visitor. Checked at most once a minute (and again when
 * the tab regains focus), so a few thousand visitors cost the database a few requests a second.
 * Any failure means "no notices": the site must keep working if this endpoint doesn't.
 */
export function useSiteNotices(): SiteNotices {
  const { data } = useQuery({
    queryKey: SITE_NOTICES_QUERY_KEY,
    queryFn: fetchSiteNotices,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return data ?? NO_NOTICES;
}
