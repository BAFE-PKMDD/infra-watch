"use client";

import React, { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getProjectMarkerColor } from "@/lib/public-project-map";

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


function FitFilteredPins({ pins, fallbackCenter, fallbackZoom }: {
  pins: ProjectPin[];
  fallbackCenter: [number, number];
  fallbackZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) {
      map.setView(fallbackCenter, fallbackZoom);
      return;
    }
    const sortedLatitudes = pins.map((pin) => pin.lat).sort((a, b) => a - b);
    const sortedLongitudes = pins.map((pin) => pin.lng).sort((a, b) => a - b);
    const trim = pins.length >= 20 ? Math.floor(pins.length * 0.02) : 0;
    const upperIndex = pins.length - 1 - trim;
    map.fitBounds([
      [sortedLatitudes[trim], sortedLongitudes[trim]],
      [sortedLatitudes[upperIndex], sortedLongitudes[upperIndex]],
    ], { padding: [24, 24], maxZoom: 10 });
  }, [fallbackCenter, fallbackZoom, map, pins]);

  return null;
}

export default function GISMapCanvas({
  filteredPins,
  setSelectedProject,
  watershedOverlay,
  agriZoneOverlay,
  mapCenter,
  mapZoom,
}: GISMapCanvasProps) {

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
        preferCanvas
        className="w-full h-full"
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <FitFilteredPins pins={filteredPins} fallbackCenter={mapCenter} fallbackZoom={mapZoom} />

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
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={5}
            pathOptions={{
              color: "#111827",
              fillColor: getProjectMarkerColor(pin.status),
              fillOpacity: 1,
              weight: 1,
            }}
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
