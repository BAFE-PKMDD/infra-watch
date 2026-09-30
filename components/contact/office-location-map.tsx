"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup } from "react-leaflet";
import { MapPin } from "lucide-react";

import { EvidenceBasemapLayer } from "@/components/shared/evidence-basemap";

export default function OfficeLocationMap({
  latitude,
  longitude,
  label,
  address,
}: {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
}) {
  const iconMarkup = renderToStaticMarkup(<MapPin className="size-5 text-white" strokeWidth={2.5} />);
  const icon = L.divIcon({
    html: `
      <div class="relative">
        <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-lg">
          ${iconMarkup}
        </div>
        <div class="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white bg-blue-600"></div>
      </div>
    `,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={false}
      className="h-full w-full"
      aria-label={label}
    >
      <EvidenceBasemapLayer basemapId="streets" />
      <Marker position={[latitude, longitude]} icon={icon}>
        <Popup>{address}</Popup>
      </Marker>
    </MapContainer>
  );
}
