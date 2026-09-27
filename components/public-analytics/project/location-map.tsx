"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import type { PublicStageKey } from "@/lib/public-analytics/rules";

import { STAGE_COLOR } from "../stage-colors";

export default function LocationMap({ latitude, longitude, stage, label }: { latitude: number; longitude: number; stage: PublicStageKey; label: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const icon = L.divIcon({
    html: `<span class="pa-pin" style="display:block;width:18px;height:18px;background:${STAGE_COLOR[stage]}"></span>`,
    className: "",
    iconSize: [18, 18],
  });
  const tileUrl = `https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`;

  return (
    <MapContainer center={[latitude, longitude]} zoom={13} scrollWheelZoom={false} className="h-full w-full" aria-label={label}>
      <TileLayer
        key={tileUrl}
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <Marker position={[latitude, longitude]} icon={icon} keyboard={false} />
    </MapContainer>
  );
}
