"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, WMSTileLayer, useMap, useMapEvents, GeoJSON } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
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
  postharvestOverlay: boolean;
  riceProcessingOverlay: boolean;
  tradingCentersOverlay: boolean;
  agriProcessingOverlay: boolean;
  productionAreaOverlay: boolean;
  measureActive?: boolean;
  serviceAreaEnabled?: boolean;
  serviceRadius?: number;
  theme: "light" | "dark";
  mapCenter: [number, number];
  mapZoom: number;
  selectedRegion?: string;
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(0)} m`;
}

function MeasureTool({ active }: { active: boolean }) {
  const [points, setPoints] = useState<LatLngTuple[]>([]);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setPoints([]);
  }

  const map = useMapEvents({
    click(e) {
      if (!active) return;
      setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
    dblclick() {
      if (!active) return;
      setPoints([]);
    },
  });

  useEffect(() => {
    map.doubleClickZoom[active ? "disable" : "enable"]();
    map.getContainer().style.cursor = active ? "crosshair" : "";
    return () => {
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = "";
    };
  }, [active, map]);

  const totalDistance = useMemo(() => {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += map.distance(points[i - 1], points[i]);
    }
    return total;
  }, [points, map]);

  if (!active || points.length === 0) return null;

  return (
    <>
      {points.map((point, i) => (
        <CircleMarker
          key={i}
          center={point}
          radius={4}
          pathOptions={{ color: "#f97316", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}
          interactive={false}
        />
      ))}
      <Polyline positions={points} pathOptions={{ color: "#f97316", weight: 3, dashArray: "6 6" }} interactive={false}>
        {points.length > 1 && (
          <Tooltip permanent direction="right" offset={[10, 0]} className="font-bold">
            {formatDistance(totalDistance)}
          </Tooltip>
        )}
      </Polyline>
    </>
  );
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

function FocusSelectedProject({ pin }: { pin: ProjectPin | null }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 14), { animate: true });
  }, [pin, map]);
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
  selectedProject,
  setSelectedProject,
  watershedOverlay,
  agriZoneOverlay,
  postharvestOverlay,
  riceProcessingOverlay,
  tradingCentersOverlay,
  agriProcessingOverlay,
  productionAreaOverlay,
  measureActive = false,
  serviceAreaEnabled = false,
  serviceRadius,
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
        <FocusSelectedProject pin={selectedProject} />
        <RegionBoundaryLayer selectedRegion={selectedRegion} />
        <MeasureTool active={measureActive} />

        {/* Serviceable area — radius of effect around every visible project */}
        {serviceAreaEnabled && !!serviceRadius && serviceRadius > 0 && filteredPins.map((pin) => (
          <Circle
            key={`svc-${pin.id}`}
            center={[pin.lat, pin.lng]}
            radius={serviceRadius}
            pathOptions={{ color: "#0ea5e9", weight: 1, fillColor: "#0ea5e9", fillOpacity: 0.12 }}
            interactive={false}
          />
        ))}

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

        {/* Postharvest Facilities (dryers, mills, processing) — live GeoServer WMS */}
        {postharvestOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:infra_postharverst_facilities`}
            {...wmsParams}
            opacity={0.85}
            attribution="&copy; BAFE GeoServer"
          />
        )}

        {/* Rice Processing Centers — live GeoServer WMS */}
        {riceProcessingOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:rice_processing_center`}
            {...wmsParams}
            opacity={0.85}
            attribution="&copy; BAFE GeoServer"
          />
        )}

        {/* Agri Trading Centers (AMAS) — live GeoServer WMS */}
        {tradingCentersOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:AMAS_TRADING_CENTERS`}
            {...wmsParams}
            opacity={0.85}
            attribution="&copy; BAFE GeoServer"
          />
        )}

        {/* Agri Processing Centers — live GeoServer WMS */}
        {agriProcessingOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:Agri Processing Centers`}
            {...wmsParams}
            opacity={0.85}
            attribution="&copy; BAFE GeoServer"
          />
        )}

        {/* Existing Agricultural Production Area (crop coverage) — live GeoServer WMS */}
        {productionAreaOverlay && GEOSERVER_URL && (
          <WMSTileLayer
            url={WMS_BASE}
            layers={`${GEOSERVER_WORKSPACE}:exisiting_agri_prod_area`}
            {...wmsParams}
            opacity={0.5}
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
