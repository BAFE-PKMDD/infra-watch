"use client";

import dynamic from "next/dynamic";

import type { PublicStageKey } from "@/lib/public-analytics/rules";

const LocationMap = dynamic(() => import("./location-map"), { ssr: false, loading: () => <div className="h-full w-full bg-pa-surface-2" /> });

export function LocationMapLoader(props: { latitude: number; longitude: number; stage: PublicStageKey; label: string }) {
  return <LocationMap {...props} />;
}
