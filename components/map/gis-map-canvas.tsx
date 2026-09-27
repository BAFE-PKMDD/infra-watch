"use client";

import React, { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, WMSTileLayer, useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getProjectMarkerColor } from "@/lib/public-project-map";

const GEOSERVER_URL = process.env.NEXT_PUBLIC_GEOSERVER_URL ?? "";
const GEOSERVER_WORKSPACE = process.env.NEXT_PUBLIC_GEOSERVER_WORKSPACE ?? "geoagri";
const WMS_BASE = `${GEOSERVER_URL}/${GEOSERVER_WORKSPACE}/wms`;

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
  selectedRegion?: string;
}

interface RegionFeature {
  type: "Feature";
  properties: { psgc_code: string; name: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface RegionsGeoJSON {
  type: "FeatureCollection";
  features: RegionFeature[];
}

function FitFilteredPins({
  pins,
  fallbackCenter,
  fallbackZoom,
}: {
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
    const lats = pins.map((p) => p.lat).sort((a, b) => a - b);
    const lngs = pins.map((p) => p.lng).sort((a, b) => a - b);
    const trim = pins.length >= 20 ? Math.floor(pins.length * 0.02) : 0;
    const upper = pins.length - 1 - trim;
    map.fitBounds([[lats[trim], lngs[trim]], [lats[upper], lngs[upper]]], {
      padding: [24, 24],
      maxZoom: 10,
    });
  }, [fallbackCenter, fallbackZoom, map, pins]);
  return null;
}

function MapSizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize({ animate: false });
    const onFull = () => window.setTimeout(invalidate, 50);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(invalidate);
      observer.observe(container);
    }
    document.addEventListener("fullscreenchange", onFull);
    window.addEventListener("resize", invalidate);
    return () => {
      observer?.disconnect();
      document.removeEventListener("fullscreenchange", onFull);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}

function isRegionSelected(rawCode: string, selectedRegion: string) {
  if (selectedRegion === "all") return false;
  const stripped = rawCode.replace(/^PH/, "");
  const target = selectedRegion.padEnd(9, "0");
  return stripped === target;
}

function RegionBoundaryLayer({ selectedRegion }: { selectedRegion: string }) {
  const [regionsData, setRegionsData] = useState<RegionsGeoJSON | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/boundaries/regions.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load region boundaries");
        return res.json();
      })
      .then((data: RegionsGeoJSON) => setRegionsData(data))
      .catch((err: Error) => setError(err));
  }, []);

  if (!regionsData || error) return null;

  const isAll = selectedRegion === "all";
  return (
    <GeoJSON
      key={selectedRegion}
      data={regionsData}
      interactive={false}
      bubblingMouseEvents={false}
      style={(feature) => {
        const raw = (feature?.properties?.psgc_code as string) ?? "";
        const isSelected = isRegionSelected(raw, selectedRegion);
        if (isSelected) {
          return { color: "#06b6d4", weight: 4, opacity: 1, fillColor: "#06b6d4", fillOpacity: 0.2, interactive: false };
        }
        return {
          color: "#ffffff",
          weight: isAll ? 2.2 : 1.6,
          opacity: isAll ? 0.95 : 0.55,
          fillColor: "#ffffff",
          fillOpacity: isAll ? 0.05 : 0.015,
          dashArray: "8, 8",
          interactive: false,
        };
      }}
    />
  );
}

export default function GISMapCanvas({
  filteredPins,
  setSelectedProject,
  watershedOverlay,
  agriZoneOverlay,
  mapCenter,
  mapZoom,
  selectedRegion = "all",
}: GISMapCanvasProps) {
  const tileUrl = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
  const attribution = '&copy; <a href="https://www.google.com/maps">Google</a>, FMR Watch Projects';

  const wmsParams = {
    transparent: true,
    format: "image/png",
    version: "1.1.1",
  } as const;

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
        <MapSizeWatcher />
        <FitFilteredPins pins={filteredPins} fallbackCenter={mapCenter} fallbackZoom={mapZoom} />
        <RegionBoundaryLayer selectedRegion={selectedRegion} />

        {/* Watersheds / Waterways — live GeoServer WMS */}
        {watershedOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:WATERWAYS`}
            {...wmsParams}
            opacity={0.7}
            attribution="&copy; BAFE GeoServer"
          />
        )}

        {/* Agricultural Production Areas — live GeoServer WMS */}
        {agriZoneOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:BSWM_AGRI_PROD_AREA`}
            {...wmsParams}
            opacity={0.6}
            attribution="&copy; BAFE GeoServer"
          />
        )}

        {/* Project marker pins */}
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
            eventHandlers={{ click: () => setSelectedProject(pin) }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
