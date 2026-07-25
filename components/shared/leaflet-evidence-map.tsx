"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  DEFAULT_EVIDENCE_BASEMAP_ID,
  EVIDENCE_BASEMAPS,
  EvidenceBasemapLayer,
  EvidenceBasemapSelector,
  type EvidenceBasemapId,
} from "@/components/shared/evidence-basemap";
import { cn } from "@/lib/utils";
import type { GeoTrackPoint } from "@/types/geo-evidence.types";

export type EvidenceMapPoint = GeoTrackPoint & {
  id: string;
  label: string;
  type?: "image" | "video" | "location";
};

export type EvidenceMapTrack = {
  id: string;
  label: string;
  points: GeoTrackPoint[];
};

type LeafletEvidenceMapProps = {
  points?: EvidenceMapPoint[];
  tracks?: EvidenceMapTrack[];
  activePoint?: GeoTrackPoint | null;
  onPointSelect?: (id: string) => void;
  editablePointIds?: readonly string[];
  onPointMove?: (id: string, position: { lat: number; lon: number }) => void;
  showAccuracy?: boolean;
  fitRequestKey?: string | number;
  followActivePoint?: boolean;
  basemapId?: EvidenceBasemapId;
  defaultBasemapId?: EvidenceBasemapId;
  onBasemapChange?: (basemapId: EvidenceBasemapId) => void;
  showBasemapSelector?: boolean;
  basemapSelectorCompact?: boolean;
  basemapSelectorClassName?: string;
  className?: string;
};

const PHILIPPINES_CENTER: [number, number] = [12.8797, 121.774];
const EMPTY_POINTS: EvidenceMapPoint[] = [];
const EMPTY_TRACKS: EvidenceMapTrack[] = [];
const EMPTY_EDITABLE_POINT_IDS: readonly string[] = [];

function markerIcon(type: EvidenceMapPoint["type"], active = false) {
  const color = type === "video" ? "#f59e0b" : type === "location" ? "#0ea5e9" : "#10b981";
  const glyph = type === "video" ? "&#9654;" : type === "location" ? "&#9679;" : "&#9670;";
  const size = active ? 38 : 32;

  return L.divIcon({
    className: "geo-evidence-marker",
    html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:12px 12px 12px 3px;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 8px 24px rgb(15 23 42 / .35)"><span style="transform:rotate(45deg);color:white;font-size:13px;line-height:1">${glyph}</span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function MapViewport({
  points,
  tracks,
  activePoint,
  fitRequestKey,
  followActivePoint,
}: {
  points: EvidenceMapPoint[];
  tracks: EvidenceMapTrack[];
  activePoint?: GeoTrackPoint | null;
  fitRequestKey?: string | number;
  followActivePoint: boolean;
}) {
  const map = useMap();
  const geometryKey = useMemo(
    () => [
      ...points.map((point) => `${point.lat}:${point.lon}`),
      ...tracks.flatMap((track) => track.points.map((point) => `${point.lat}:${point.lon}`)),
    ].join("|"),
    [points, tracks],
  );

  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize({ pan: false });
    const frame = window.requestAnimationFrame(invalidate);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(invalidate);
    observer?.observe(container);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [map]);

  useEffect(() => {
    const coordinates = [
      ...points.map((point) => L.latLng(point.lat, point.lon)),
      ...tracks.flatMap((track) => track.points.map((point) => L.latLng(point.lat, point.lon))),
    ];

    if (coordinates.length === 0) {
      map.setView(PHILIPPINES_CENTER, 5);
      return;
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 16);
      return;
    }

    map.fitBounds(L.latLngBounds(coordinates), { padding: [36, 36], maxZoom: 16 });
  }, [fitRequestKey, geometryKey, map, points, tracks]);

  useEffect(() => {
    if (!activePoint || !followActivePoint) return;
    const position = L.latLng(activePoint.lat, activePoint.lon);
    if (!map.getBounds().pad(-0.12).contains(position)) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.panTo(position, { animate: !reducedMotion, duration: reducedMotion ? 0 : 0.35 });
    }
  }, [activePoint, followActivePoint, map]);

  return null;
}

export default function LeafletEvidenceMap({
  points = EMPTY_POINTS,
  tracks = EMPTY_TRACKS,
  activePoint,
  onPointSelect,
  editablePointIds = EMPTY_EDITABLE_POINT_IDS,
  onPointMove,
  showAccuracy = false,
  fitRequestKey,
  followActivePoint = true,
  basemapId: controlledBasemapId,
  defaultBasemapId = DEFAULT_EVIDENCE_BASEMAP_ID,
  onBasemapChange,
  showBasemapSelector = false,
  basemapSelectorCompact = false,
  basemapSelectorClassName,
  className = "h-80 w-full",
}: LeafletEvidenceMapProps) {
  const [uncontrolledBasemapId, setUncontrolledBasemapId] = useState(defaultBasemapId);
  const basemapId = controlledBasemapId ?? uncontrolledBasemapId;
  const pointIcons = useMemo(
    () => new Map(points.map((point) => [point.id, markerIcon(point.type)])),
    [points],
  );
  const activeIcon = useMemo(() => markerIcon("video", true), []);
  const editablePointIdSet = useMemo(() => new Set(editablePointIds), [editablePointIds]);
  const handleBasemapChange = useCallback((nextBasemapId: EvidenceBasemapId) => {
    if (controlledBasemapId === undefined) {
      setUncontrolledBasemapId(nextBasemapId);
    }
    onBasemapChange?.(nextBasemapId);
  }, [controlledBasemapId, onBasemapChange]);

  return (
    <div className={cn(
      "relative isolate overflow-hidden bg-slate-100 dark:bg-slate-950",
      basemapId === "streets" && "dark:[&_.leaflet-tile-pane]:brightness-[0.72] dark:[&_.leaflet-tile-pane]:contrast-[1.12]",
      basemapId === "terrain" && "dark:[&_.leaflet-tile-pane]:brightness-[0.82] dark:[&_.leaflet-tile-pane]:contrast-[1.08]",
      className,
    )}>
      <MapContainer
        center={PHILIPPINES_CENTER}
        zoom={5}
        maxZoom={EVIDENCE_BASEMAPS[DEFAULT_EVIDENCE_BASEMAP_ID].maxZoom}
        zoomControl
        className="h-full w-full"
      >
        <EvidenceBasemapLayer basemapId={basemapId} />
        <MapViewport
          points={points}
          tracks={tracks}
          activePoint={activePoint}
          fitRequestKey={fitRequestKey}
          followActivePoint={followActivePoint}
        />

        {tracks.map((track) => {
          const positions = track.points.map((point) => [point.lat, point.lon] as [number, number]);
          if (positions.length === 0) return null;

          return (
            <Polyline
              key={track.id}
              positions={positions}
              pathOptions={{ color: "#f59e0b", weight: 4, opacity: 0.88, lineCap: "round" }}
            >
              <Popup>
                <strong>{track.label}</strong>
                <br />
                {track.points.length} GPS point{track.points.length === 1 ? "" : "s"}
              </Popup>
            </Polyline>
          );
        })}

        {tracks.flatMap((track) => {
          if (track.points.length < 2) return [];
          const first = track.points[0];
          const last = track.points[track.points.length - 1];
          return [
            <CircleMarker
              key={`${track.id}-start`}
              center={[first.lat, first.lon]}
              radius={6}
              pathOptions={{ color: "#ffffff", fillColor: "#10b981", fillOpacity: 1, weight: 2 }}
            >
              <Popup>{track.label} start</Popup>
            </CircleMarker>,
            <CircleMarker
              key={`${track.id}-end`}
              center={[last.lat, last.lon]}
              radius={6}
              pathOptions={{ color: "#ffffff", fillColor: "#ef4444", fillOpacity: 1, weight: 2 }}
            >
              <Popup>{track.label} end</Popup>
            </CircleMarker>,
          ];
        })}

        {showAccuracy
          ? points.map((point) =>
              typeof point.accuracy === "number" &&
              Number.isFinite(point.accuracy) &&
              point.accuracy > 0 ? (
                <Circle
                  key={`${point.id}-accuracy`}
                  center={[point.lat, point.lon]}
                  radius={point.accuracy}
                  interactive={false}
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.08,
                    opacity: 0.55,
                    weight: 1.5,
                  }}
                />
              ) : null,
            )
          : null}

        {points.map((point) => {
          const isEditable = editablePointIdSet.has(point.id) && Boolean(onPointMove);
          const eventHandlers = {
            ...(onPointSelect ? { click: () => onPointSelect(point.id) } : {}),
            ...(isEditable
              ? {
                  dragend: (event: L.LeafletEvent) => {
                    const position = (event.target as L.Marker).getLatLng();
                    onPointMove?.(point.id, { lat: position.lat, lon: position.lng });
                  },
                }
              : {}),
          };

          return (
            <Marker
              key={point.id}
              position={[point.lat, point.lon]}
              icon={pointIcons.get(point.id)}
              draggable={isEditable}
              eventHandlers={eventHandlers}
            >
              <Popup>
                <strong>{point.label}</strong>
                <br />
                {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
                {typeof point.accuracy === "number" ? <><br />Accuracy: &plusmn;{Math.round(point.accuracy)} m</> : null}
                {isEditable ? <><br />Drag the pin to correct its location.</> : null}
              </Popup>
            </Marker>
          );
        })}

        {activePoint ? (
          <Marker
            position={[activePoint.lat, activePoint.lon]}
            icon={activeIcon}
            zIndexOffset={1000}
            interactive={false}
          />
        ) : null}
      </MapContainer>

      {showBasemapSelector ? (
        <EvidenceBasemapSelector
          value={basemapId}
          onValueChange={handleBasemapChange}
          compact={basemapSelectorCompact}
          className={cn("absolute right-3 top-3 z-[850]", basemapSelectorClassName)}
        />
      ) : null}
    </div>
  );
}
