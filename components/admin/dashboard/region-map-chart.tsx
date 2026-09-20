"use client";

import { useEffect, useState } from "react";
import { GeoJSON, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { DEFAULT_EVIDENCE_BASEMAP_ID, EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";
import type { ManagerialDashboardData } from "@/types/managerial-dashboard.types";
import { ChartEmptyState, ChartPanel } from "./chart-panel";
import { NOT_ASSESSED_FILL, NO_MATCH_FILL, PSGC_TO_LIVE_REGION, delayedRateFillColor } from "./region-map-data";

type RegionRow = ManagerialDashboardData["regions"][number];

type RegionsGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { psgc_code: string; name: string };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
  }>;
};

const PH_CENTER: [number, number] = [12.8797, 121.774];
const PH_ZOOM = 5;

export function RegionMapChart({
  data,
  onSelect,
}: {
  data: ManagerialDashboardData["regions"];
  onSelect?: (region: string) => void;
}) {
  const [regionsGeoJson, setRegionsGeoJson] = useState<RegionsGeoJson | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/boundaries/regions.json")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load region boundaries");
        return response.json() as Promise<RegionsGeoJson>;
      })
      .then((geoJson) => {
        if (!cancelled) setRegionsGeoJson(geoJson);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byRegion = new Map<string, RegionRow>(data.map((row) => [row.region, row]));
  const rankedByDelayedRate = [...data]
    .map((row) => ({ ...row, delayedRate: row.assessed > 0 ? (row.delayed / row.assessed) * 100 : 0 }))
    .sort((a, b) => b.delayedRate - a.delayedRate);
  const summary = rankedByDelayedRate.length > 0
    ? rankedByDelayedRate.map((row) => `${row.region}: ${row.delayedRate.toFixed(1)}% delayed of assessed projects`).join("; ")
    : "No regional data available.";
  const fingerprint = data.map((row) => `${row.region}:${row.delayed}:${row.assessed}:${row.total}`).join("|");

  function fillForPsgcCode(psgcCode: string) {
    const liveRegion = PSGC_TO_LIVE_REGION[psgcCode];
    const row = liveRegion ? byRegion.get(liveRegion) : undefined;
    if (!row || row.total === 0) return NO_MATCH_FILL;
    if (row.assessed === 0) return NOT_ASSESSED_FILL;
    return delayedRateFillColor((row.delayed / row.assessed) * 100);
  }

  function tooltipForPsgcCode(psgcCode: string, fallbackName: string) {
    const liveRegion = PSGC_TO_LIVE_REGION[psgcCode];
    const row = liveRegion ? byRegion.get(liveRegion) : undefined;
    const label = liveRegion ?? fallbackName;
    if (!row || row.total === 0) return `<strong>${label}</strong><br/>No projects in the current scope.`;
    if (row.assessed === 0) return `<strong>${label}</strong><br/>${row.total.toLocaleString("en-PH")} projects, none assessable for schedule.`;
    const rate = ((row.delayed / row.assessed) * 100).toFixed(1);
    return `<strong>${label}</strong><br/>${rate}% delayed (${row.delayed} of ${row.assessed} assessed; ${row.total} total).`;
  }

  return (
    <ChartPanel
      title="Where are delayed projects concentrated?"
      description="Regions shaded by delayed rate (delayed divided by assessed projects), the same figures used in Regional performance ranking. Gray means no assessable projects in that region. Boundaries are simplified; BARMM is shown using its pre-2019 ARMM-era outline, the same territory under its current name. Select a region to filter the dashboard."
      summary={summary}
    >
      {loadError ? (
        <ChartEmptyState title="Map unavailable" detail="Could not load region boundary data. Regional performance ranking below has the same figures." />
      ) : !regionsGeoJson ? (
        <ChartEmptyState title="Loading map…" />
      ) : data.length === 0 ? (
        <ChartEmptyState detail="No regional data available." />
      ) : (
        <>
          <div className="h-[420px] w-full overflow-hidden rounded-md" role="img" aria-label="Map of the Philippines shaded by regional delayed-project rate">
            <MapContainer center={PH_CENTER} zoom={PH_ZOOM} zoomControl scrollWheelZoom={false} className="h-full w-full">
              <EvidenceBasemapLayer basemapId={DEFAULT_EVIDENCE_BASEMAP_ID} />
              <GeoJSON
                key={fingerprint}
                data={regionsGeoJson}
                style={(feature) => {
                  const psgcCode = (feature?.properties?.psgc_code as string) ?? "";
                  return { color: "#94a3b8", weight: 1, fillColor: fillForPsgcCode(psgcCode), fillOpacity: 0.85 };
                }}
                onEachFeature={(feature, layer) => {
                  const psgcCode = (feature.properties?.psgc_code as string) ?? "";
                  const fallbackName = (feature.properties?.name as string) ?? psgcCode;
                  layer.bindTooltip(tooltipForPsgcCode(psgcCode, fallbackName), { sticky: true });
                  const liveRegion = PSGC_TO_LIVE_REGION[psgcCode];
                  if (onSelect && liveRegion) {
                    layer.on("click", () => onSelect(liveRegion));
                  }
                }}
              />
            </MapContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Delayed rate</span>
            <LegendSwatch color="#dcfce7" label="0%" />
            <LegendSwatch color="#fca5a5" label="~15%" />
            <LegendSwatch color="#ef4444" label="~60%" />
            <LegendSwatch color="#b91c1c" label="75%+" />
            <LegendSwatch color={NOT_ASSESSED_FILL} label="Not assessable" />
          </div>
        </>
      )}
    </ChartPanel>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block size-3 rounded-sm border border-slate-300 dark:border-slate-600" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
