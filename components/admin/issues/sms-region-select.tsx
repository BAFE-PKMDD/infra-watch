"use client";

import { useQuery } from "@tanstack/react-query";

import { getProjectRegions } from "@/actions/query/get-location-options";

// Backed by real project data (projects.region — the same field moderator scoping
// matches against) so a routing tag can't drift into a typo that never matches a
// real region.
export function SmsRegionSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["project-regions"],
    queryFn: () => getProjectRegions(),
    staleTime: Infinity,
  });

  // Keep whatever value is already set (e.g. restored from local storage, or
  // auto-filled from a selected project) selectable even if it fell out of the list.
  const options = value && !regions.some((region) => region.value === value)
    ? [...regions, { value, label: value }]
    : regions;

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
    >
      <option value="">{isLoading ? "Loading regions…" : "Select a region"}</option>
      {options.map((region) => (
        <option key={region.value} value={region.value}>{region.label}</option>
      ))}
    </select>
  );
}
