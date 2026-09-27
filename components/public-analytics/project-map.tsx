"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

// leaflet must be evaluated first: the markercluster plugin attaches itself to the global L.
import L from "leaflet";
import "leaflet.markercluster";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Popup, useMap } from "react-leaflet";

import { EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";

import type { MapPoint } from "@/lib/public-analytics/aggregate";
import { PUBLIC_STAGES, type PublicStageKey } from "@/lib/public-analytics/rules";
import { publicAnalyticsStrings as S, format, formatPesos } from "@/lib/public-analytics/strings";

import { STAGE_COLOR } from "./stage-colors";

const t = S.en;

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

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count < 100 ? 36 : count < 1000 ? 44 : 52;
  return L.divIcon({
    html: `<span>${count.toLocaleString("en-PH")}</span>`,
    className: "pa-cluster",
    iconSize: [size, size],
  });
}

function pinIcon(stage: PublicStageKey) {
  return L.divIcon({
    html: `<span class="pa-pin" style="display:block;background:${STAGE_COLOR[stage]}"></span>`,
    className: "",
    iconSize: [14, 14],
  });
}

function Pins({ points, onSelect }: { points: MapPoint[]; onSelect: (id: string, lat: number, lng: number) => void }) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const icons = Object.fromEntries(PUBLIC_STAGES.map((stage) => [stage, pinIcon(stage)])) as Record<PublicStageKey, L.DivIcon>;
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: clusterIcon,
    });
    const markers = points.map(([id, lat, lng, stageIndex]) => {
      const stage = PUBLIC_STAGES[stageIndex] ?? "construction";
      const marker = L.marker([lat, lng], { icon: icons[stage], title: t.stages[stage], keyboard: false });
      marker.on("click", () => onSelectRef.current(id, lat, lng));
      return marker;
    });
    group.addLayers(markers);
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, points]);

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
  const [selected, setSelected] = useState<{ id: string; lat: number; lng: number } | null>(null);

  return (
    <MapContainer center={PHILIPPINES_CENTER} zoom={5} minZoom={5} scrollWheelZoom={false} className="h-full w-full" aria-label={t.map.mapLabel}>
      <EvidenceBasemapLayer basemapId="satellite" />
      <Pins points={points} onSelect={(id, lat, lng) => setSelected({ id, lat, lng })} />
      <FlyTo target={flyTo} />
      {selected ? (
        <Popup position={[selected.lat, selected.lng]} eventHandlers={{ remove: () => setSelected(null) }}>
          <PinCard key={selected.id} id={selected.id} />
        </Popup>
      ) : null}
    </MapContainer>
  );
}
