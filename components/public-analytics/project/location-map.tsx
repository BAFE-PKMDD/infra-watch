"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker } from "react-leaflet";

import { EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";
import type { PublicStageKey } from "@/lib/public-analytics/rules";

import { STAGE_COLOR } from "../stage-colors";

export default function LocationMap({ latitude, longitude, stage, label }: { latitude: number; longitude: number; stage: PublicStageKey; label: string }) {
  const icon = L.divIcon({
    html: `<span class="pa-pin" style="display:block;width:18px;height:18px;background:${STAGE_COLOR[stage]}"></span>`,
    className: "",
    iconSize: [18, 18],
  });

  return (
    <MapContainer center={[latitude, longitude]} zoom={13} scrollWheelZoom={false} className="h-full w-full" aria-label={label}>
      <EvidenceBasemapLayer basemapId="satellite" />
      <Marker position={[latitude, longitude]} icon={icon} keyboard={false} />
    </MapContainer>
  );
}
