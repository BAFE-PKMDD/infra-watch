"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Popup, useMap } from "react-leaflet";

import { EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";

import type { MapPoint } from "@/lib/public-analytics/aggregate";
import { PUBLIC_STAGES, type PublicStageKey } from "@/lib/public-analytics/rules";
import { format, formatPesos } from "@/lib/public-analytics/strings";

import { STAGE_COLOR } from "./stage-colors";
import { usePublicAnalyticsStrings } from "./use-strings";

const PHILIPPINES_CENTER: [number, number] = [12.3, 122.5];

export type FlyTarget = { lat: number; lng: number; zoom: number; key: number } | null;

type PinDetail = {
  id: string;
  name: string;
  projectType: string;
  stage: PublicStageKey;
  budget: number | null;
  year: number | null;
  photos: Array<{ url: string }>;
};

function Pins({ points, onSelect }: { points: MapPoint[]; onSelect: (id: string, lat: number, lng: number) => void }) {
  const t = usePublicAnalyticsStrings();
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    // One canvas keeps thousands of individual project points responsive.
    const renderer = L.canvas({ padding: 0.3, tolerance: 16 });
    const readColors = () => {
      const styles = getComputedStyle(map.getContainer());
      return Object.fromEntries(PUBLIC_STAGES.map((stage) => [
        stage,
        styles.getPropertyValue(STAGE_COLOR[stage].slice(4, -1)).trim(),
      ])) as Record<PublicStageKey, string>;
    };
    const colors = readColors();
    const markers = points.map(([id, lat, lng, stageIndex]) => {
      const stage = PUBLIC_STAGES[stageIndex] ?? "construction";
      const marker = L.circleMarker([lat, lng], {
        renderer,
        radius: 5,
        color: "#fbfcfa",
        weight: 1.5,
        fillColor: colors[stage],
        fillOpacity: 1,
      });
      marker.bindTooltip(t.stages[stage], { direction: "top" });
      marker.on("click", () => onSelectRef.current(id, lat, lng));
      return { marker, stage };
    });
    const group = L.layerGroup(markers.map(({ marker }) => marker)).addTo(map);
    // Canvas colors must be resolved again when the page changes theme.
    const observer = new MutationObserver(() => {
      const nextColors = readColors();
      markers.forEach(({ marker, stage }) => marker.setStyle({ fillColor: nextColors[stage] }));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      group.remove();
      renderer.remove();
    };
  }, [map, points, t]);

  return null;
}

function FlyTo({ target }: { target: FlyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.6 });
  }, [map, target]);
  return null;
}

function PinCard({ id }: { id: string }) {
  const t = usePublicAnalyticsStrings();
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; data: PinDetail }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/projects/${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((json: { data: PinDetail }) => !cancelled && setState({ status: "ready", data: json.data }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <p className="text-sm text-pa-ink-2">{t.map.loading}</p>;
  if (state.status === "error") return <p className="text-sm text-pa-ink-2">{t.map.loadFailed}</p>;

  const project = state.data;
  const photo = project.photos[0];
  return (
    <div className="space-y-2 text-sm text-pa-ink">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- source photos come from several external hosts
        <img src={photo.url} alt={format(t.map.photoAlt, { name: project.name })} className="h-28 w-full rounded object-cover" loading="lazy" />
      ) : null}
      <p className="text-base font-semibold leading-snug">{project.name}</p>
      <p className="text-pa-ink-2">{project.projectType}</p>
      <p className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ background: STAGE_COLOR[project.stage] }} />
        {t.stages[project.stage]}
      </p>
      <p className="text-pa-ink-2">
        {project.budget !== null ? formatPesos(project.budget) : t.chart.noBudget}
        {project.year ? ` · ${t.filters.year} ${project.year}` : ""}
      </p>
      <Link href={`/projects/${project.id}`} className="inline-flex min-h-11 items-center font-medium text-pa-accent underline underline-offset-4">
        {t.map.openProject}
      </Link>
    </div>
  );
}

export default function ProjectMap({ points, flyTo }: { points: MapPoint[]; flyTo: FlyTarget }) {
  const t = usePublicAnalyticsStrings();
  const [selected, setSelected] = useState<{ id: string; lat: number; lng: number } | null>(null);
  const visibleSelection = selected && points.some(([id]) => id === selected.id) ? selected : null;

  return (
    <MapContainer center={PHILIPPINES_CENTER} zoom={5} minZoom={5} scrollWheelZoom={false} className="h-full w-full" aria-label={t.map.mapLabel}>
      <EvidenceBasemapLayer basemapId="satellite" />
      <Pins points={points} onSelect={(id, lat, lng) => setSelected({ id, lat, lng })} />
      <FlyTo target={flyTo} />
      {visibleSelection ? (
        <Popup position={[visibleSelection.lat, visibleSelection.lng]} eventHandlers={{ remove: () => setSelected(null) }}>
          <PinCard key={visibleSelection.id} id={visibleSelection.id} />
        </Popup>
      ) : null}
    </MapContainer>
  );
}
