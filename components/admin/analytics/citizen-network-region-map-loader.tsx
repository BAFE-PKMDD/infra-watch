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
  return <CitizenNetworkRegionMap geography={geography} />;
}
