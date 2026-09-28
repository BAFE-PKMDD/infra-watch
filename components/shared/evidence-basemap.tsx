"use client";

import { useEffect, useMemo } from "react";
import { Map as MapIcon, Mountain, Satellite } from "lucide-react";
import { TileLayer, useMap } from "react-leaflet";

import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

export type EvidenceBasemapId = "streets" | "satellite" | "terrain";

type EvidenceBasemapDefinition = {
  id: EvidenceBasemapId;
  label: string;
  description: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxNativeZoom: number;
  maxZoom: number;
  /** Optional labels/roads layer drawn above a muted base layer (e.g. Esri's Light Gray Canvas is split in two). */
  referenceUrl?: string;
};

export const DEFAULT_EVIDENCE_BASEMAP_ID: EvidenceBasemapId = "streets";

export const EVIDENCE_BASEMAPS: Record<EvidenceBasemapId, EvidenceBasemapDefinition> = {
  streets: {
    id: "streets",
    label: "Street",
    description: "Roads and places",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    referenceUrl: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ",
    maxNativeZoom: 16,
    maxZoom: 20,
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    description: "Aerial imagery",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community",
    maxNativeZoom: 19,
    maxZoom: 20,
  },
  terrain: {
    id: "terrain",
    label: "Terrain",
    description: "Contours and relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    subdomains: "abc",
    maxNativeZoom: 17,
    maxZoom: 19,
  },
};

const EVIDENCE_BASEMAP_OPTIONS = [
  EVIDENCE_BASEMAPS.streets,
  EVIDENCE_BASEMAPS.satellite,
  EVIDENCE_BASEMAPS.terrain,
] as const;

const BASEMAP_ICONS = {
  streets: MapIcon,
  satellite: Satellite,
  terrain: Mountain,
} as const;

export const MAP_CONTROL_SURFACE_CLASS =
  "border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";

function BasemapZoomPolicy({ basemapId }: { basemapId: EvidenceBasemapId }) {
  const map = useMap();

  useEffect(() => {
    const { maxZoom } = EVIDENCE_BASEMAPS[basemapId];
    map.setMaxZoom(maxZoom);
    if (map.getZoom() > maxZoom) {
      map.setZoom(maxZoom, { animate: false });
    }
  }, [basemapId, map]);

  return null;
}

type EvidenceBasemapLayerProps = {
  basemapId: EvidenceBasemapId;
  revision?: number;
  onLoading?: () => void;
  onLoad?: () => void;
  onTileError?: () => void;
};

export function EvidenceBasemapLayer({
  basemapId,
  revision = 0,
  onLoading,
  onLoad,
  onTileError,
}: EvidenceBasemapLayerProps) {
  const basemap = EVIDENCE_BASEMAPS[basemapId];
  const eventHandlers = useMemo(() => ({
    loading: () => onLoading?.(),
    load: () => onLoad?.(),
    tileerror: () => onTileError?.(),
  }), [onLoad, onLoading, onTileError]);

  return (
    <>
      <TileLayer
        key={`${basemap.id}:${revision}`}
        attribution={basemap.attribution}
        url={basemap.url}
        {...(basemap.subdomains ? { subdomains: basemap.subdomains } : {})}
        maxNativeZoom={basemap.maxNativeZoom}
        maxZoom={basemap.maxZoom}
        keepBuffer={3}
        eventHandlers={eventHandlers}
      />
      {basemap.referenceUrl && (
        <TileLayer
          key={`${basemap.id}:reference:${revision}`}
          url={basemap.referenceUrl}
          maxNativeZoom={basemap.maxNativeZoom}
          maxZoom={basemap.maxZoom}
          keepBuffer={3}
        />
      )}
      <BasemapZoomPolicy basemapId={basemapId} />
    </>
  );
}

type EvidenceBasemapSelectorProps = {
  value: EvidenceBasemapId;
  onValueChange: (value: EvidenceBasemapId) => void;
  compact?: boolean;
  className?: string;
};

export function EvidenceBasemapSelector({
  value,
  onValueChange,
  compact = false,
  className,
}: EvidenceBasemapSelectorProps) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("community.basemap.groupLabel")}
      className={cn(
        "inline-flex items-center gap-1 rounded-md p-1",
        MAP_CONTROL_SURFACE_CLASS,
        className,
      )}
    >
      {EVIDENCE_BASEMAP_OPTIONS.map((option) => {
        const Icon = BASEMAP_ICONS[option.id];
        const selected = option.id === value;
        // The option list keeps its English label/description; the viewer sees community.basemap text.
        const label = t(`community.basemap.${option.id}`);
        const description = t(`community.basemap.${option.id}Description`);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onValueChange(option.id)}
            aria-pressed={selected}
            aria-label={t("community.basemap.optionLabel", { label, description })}
            title={t("community.basemap.optionTitle", { label, description })}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className={compact ? "sr-only" : "hidden sm:inline"}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
