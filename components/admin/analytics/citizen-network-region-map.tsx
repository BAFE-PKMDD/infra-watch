"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { DEFAULT_EVIDENCE_BASEMAP_ID, EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";
import type { CitizenEngagementAnalytics } from "@/lib/analytics/citizen-engagement-query";

type Geography = CitizenEngagementAnalytics["networkGeography"];
type RegionsGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { psgc_code: string; name: string };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
  }>;
};

const PH_CENTER: [number, number] = [12.8797, 121.774];
const NO_DATA_FILL = "#e2e8f0";

function fillForCount(count: number, maximum: number) {
  if (count <= 0) return NO_DATA_FILL;
  const ratio = count / Math.max(maximum, 1);
  if (ratio <= 0.25) return "#bfdbfe";
  if (ratio <= 0.5) return "#60a5fa";
  if (ratio <= 0.75) return "#2563eb";
  return "#1e3a8a";
}

export function CitizenNetworkRegionMap({ geography }: { geography: Geography }) {
  const [boundaries, setBoundaries] = useState<RegionsGeoJson | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/boundaries/regions.json")
      .then((response) => {
        if (!response.ok) throw new Error("Region boundaries unavailable");
        return response.json() as Promise<RegionsGeoJson>;
      })
      .then((value) => { if (!cancelled) setBoundaries(value); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(
    () => new Map(geography.regions.map((row) => [row.code, row.count])),
    [geography.regions],
  );
  const maximum = Math.max(...geography.regions.map((row) => row.count), 1);
  const names = useMemo(
    () => new Map(boundaries?.features.map((feature) => [feature.properties.psgc_code, feature.properties.name]) ?? []),
    [boundaries],
  );

  if (geography.regions.length === 0) {
    return <p className="mt-4 border-l-2 border-slate-200 py-3 pl-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">No region meets the minimum of {geography.minimumEventCount} recorded actions for this period.</p>;
  }
  if (loadError) {
    return <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">The region boundary map is unavailable. The regional action list remains available below.</p>;
  }

  return (
    <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      {!boundaries ? (
        <div className="flex h-[420px] items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">Loading region boundaries…</div>
      ) : (
        <div className="h-[420px] overflow-hidden rounded-md border border-slate-200 dark:border-slate-700" role="img" aria-label="Map of the Philippines shaded by approximate network-region action count">
          <MapContainer center={PH_CENTER} zoom={5} scrollWheelZoom={false} className="h-full w-full">
            <EvidenceBasemapLayer basemapId={DEFAULT_EVIDENCE_BASEMAP_ID} />
            <GeoJSON
              key={geography.regions.map((row) => `${row.code}:${row.count}`).join("|")}
              data={boundaries}
              style={(feature) => {
                const code = (feature?.properties?.psgc_code as string) ?? "";
                return {
                  color: "#94a3b8",
                  weight: 1,
                  fillColor: fillForCount(counts.get(code) ?? 0, maximum),
                  fillOpacity: 0.82,
                };
              }}
              onEachFeature={(feature, layer) => {
                const code = (feature.properties?.psgc_code as string) ?? "";
                const name = (feature.properties?.name as string) ?? "Region";
                const count = counts.get(code);
                layer.bindTooltip(count
                  ? `<strong>${name}</strong><br/>${count.toLocaleString("en-PH")} recorded actions`
                  : `<strong>${name}</strong><br/>No displayed data`, { sticky: true });
              }}
            />
          </MapContainer>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Displayed regions</h3>
        <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {geography.regions.map((row) => (
            <li key={row.code} className="flex items-start justify-between gap-4 py-3 text-sm">
              <span className="text-slate-700 dark:text-slate-200">{names.get(row.code) ?? row.code}</span>
              <span className="font-semibold tabular-nums text-slate-950 dark:text-white">{row.count.toLocaleString("en-PH")}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5"><i className="size-3 bg-blue-200" aria-hidden="true" />Lower</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-3 bg-blue-900" aria-hidden="true" />Higher</span>
        </div>
      </div>
    </div>
  );
}
