"use client";

import dynamic from "next/dynamic";

import type { CitizenEngagementAnalytics } from "@/lib/analytics/citizen-engagement-query";

const CitizenNetworkRegionMap = dynamic(
  () => import("./citizen-network-region-map").then((module) => module.CitizenNetworkRegionMap),
  {
    ssr: false,
    loading: () => <div className="mt-4 h-[420px] animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" aria-label="Loading approximate network-region map" />,
  },
);

export function CitizenNetworkRegionMapLoader({
  geography,
}: {
  geography: CitizenEngagementAnalytics["networkGeography"];
}) {
  if (geography.regions.length === 0) {
    return <p role="status" className="mt-4 border-l-2 border-slate-200 py-3 pl-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">No reportable region data is available for this period. Region tracking may be disabled or unavailable. Regions with fewer than {geography.minimumEventCount} recorded actions are omitted.</p>;
  }
  return <CitizenNetworkRegionMap geography={geography} />;
}
