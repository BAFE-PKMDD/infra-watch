"use client";

import React, { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface ProjectPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  type: string;
  desc: string;
  progress: number;
}

interface GISMapCanvasProps {
  filteredPins: ProjectPin[];
  selectedProject: ProjectPin | null;
  setSelectedProject: (pin: ProjectPin | null) => void;
  watershedOverlay: boolean;
  agriZoneOverlay: boolean;
  theme: "light" | "dark";
  mapCenter: [number, number];
  mapZoom: number;
}

// Controller to animate zooming and panning
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

const createCustomMarker = (status: string) => {
  const colorClass = 
    status === "completed" ? "bg-primary ring-primary" : 
    status === "ongoing" ? "bg-amber-500 ring-amber-500" : 
    status === "suspended" ? "bg-rose-600 ring-rose-600" : "bg-slate-400 ring-slate-400";
  
  const markerHtml = `
    <div class="relative flex items-center justify-center w-7 h-7 rounded-full ${colorClass} ring-4 ring-offset-2 ring-offset-white/70 dark:ring-offset-slate-900/70 shadow-lg transition-transform hover:scale-110 duration-200">
      <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: "custom-leaflet-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

export default function GISMapCanvas({
  filteredPins,
  selectedProject,
  setSelectedProject,
  watershedOverlay,
  agriZoneOverlay,
  theme,
  mapCenter,
  mapZoom,
}: GISMapCanvasProps) {
  // Reset leaflet default icon paths
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  const lightTiles = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileUrl = theme === "dark" ? darkTiles : lightTiles;
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Polygon layers coordinates
  const watershedPolygon: [number, number][] = [
    [10.6, 124.9],
    [10.9, 124.9],
    [10.9, 125.15],
    [10.6, 125.15],
  ];

  const agriZonePolygon: [number, number][] = [
    [11.2, 125.0],
    [11.4, 125.0],
    [11.4, 125.2],
    [11.2, 125.2],
  ];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        zoomControl={false}
        className="w-full h-full"
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <TileLayer url={tileUrl} attribution={attribution} />

        {/* Watersheds overlay boundary polygon */}
        {watershedOverlay && (
          <Polygon
            positions={watershedPolygon}
            pathOptions={{
              color: "rgb(20, 184, 166)", // teal-500
              fillColor: "rgb(20, 184, 166)",
              fillOpacity: 0.1,
              dashArray: "6, 6",
              weight: 3,
            }}
          />
        )}

        {/* Agricultural Zone overlay boundary polygon */}
        {agriZoneOverlay && (
          <Polygon
            positions={agriZonePolygon}
            pathOptions={{
              color: "rgb(245, 158, 11)", // amber-500
              fillColor: "rgb(245, 158, 11)",
              fillOpacity: 0.1,
              dashArray: "6, 6",
              weight: 3,
            }}
          />
        )}

        {/* Marker pins */}
        {filteredPins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createCustomMarker(pin.status)}
            eventHandlers={{
              click: () => {
                setSelectedProject(pin);
              },
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 min-w-[150px]">
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block mb-0.5">{pin.id}</span>
                <h4 className="font-extrabold text-xs text-slate-900 leading-tight mb-1">{pin.name}</h4>
                <p className="text-[10px] text-slate-650 dark:text-slate-300 mb-1">{pin.desc}</p>
                <div className="flex items-center gap-1.5 text-[9px] font-bold">
                  <span className="text-slate-450">Progress:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">{pin.progress}%</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
