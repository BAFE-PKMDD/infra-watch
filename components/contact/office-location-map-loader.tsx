"use client";

import dynamic from "next/dynamic";

const OfficeLocationMap = dynamic(() => import("./office-location-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />,
});

export function OfficeLocationMapLoader(props: {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
}) {
  return <OfficeLocationMap {...props} />;
}
