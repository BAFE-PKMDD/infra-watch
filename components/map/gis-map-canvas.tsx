"use client";

import React, { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polygon, useMap } from "react-leaflet";
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

const createCustomMarker = (status: string) => {
  let mainColor = "#22c55e"; // Green for completed
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  
  if (normalizedStatus === "ongoing") {
    mainColor = "#eab308"; // Yellow for ongoing
  } else if (normalizedStatus === "notyetstarted") {
    mainColor = "#ef4444"; // Red for not yet started
  }

  const markerHtml = `
    <div style="width: 10px; height: 10px; display: flex; align-items: center; justify-content: center;">
      <svg width="10" height="10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
        <circle cx="50" cy="50" r="45" fill="${mainColor}" stroke="black" stroke-width="10" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: "custom-leaflet-marker bg-transparent border-0",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -5]
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

  const tileUrl = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
  const attribution = '&copy; <a href="https://www.google.com/maps">Google</a>, FMR Watch Projects';

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
          />
        ))}
      </MapContainer>
    </div>
  );
}
