"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Compass, Loader2, Search, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapPins } from "@/actions/query/public-projects.query";
import { MAP_PIN_LOCATION_UNAVAILABLE, toSourceBackedMapPins } from "@/lib/public-project-map";
import { sendCitizenEngagementEvent } from "@/lib/analytics/citizen-event-client";
import { useTranslation } from "@/i18n";


// Dynamically import Leaflet Map Component with SSR disabled
const GISMapCanvas = dynamic(
  () => import("@/components/map/gis-map-canvas"),
  {
    ssr: false,
    loading: () => <MapCanvasLoading />,
  }
);

function MapCanvasLoading() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center text-xs font-semibold text-slate-500 animate-pulse">
      {t("directory.infraMap.loadingCanvas")}
    </div>
  );
}

type PublicMapPin = ReturnType<typeof toSourceBackedMapPins>[number];

const defaultCenter: [number, number] = [12.8797, 121.7740];
const defaultZoom = 6;

// Pin status codes (see toSourceBackedMapPins) to their display label keys.
const PIN_STATUS_LABEL_KEYS: Record<string, string> = {
  completed: "directory.status.completed",
  ongoing: "directory.status.onGoing",
  notyetstarted: "directory.status.notYetStarted",
};

export default function GISMapPage() {
  const { t } = useTranslation();

  const { resolvedTheme } = useTheme();

  const { data: sourceRows = [], isLoading, isError } = useQuery({
    queryKey: ["public-map-source-pins", 2],
    queryFn: () => getPublicMapPins({}),
    staleTime: 5 * 60 * 1000,
  });
  const mapProjects = React.useMemo(() => toSourceBackedMapPins(sourceRows), [sourceRows]);

  const [selectedProject, setSelectedProject] = useState<PublicMapPin | null>(null);
  const [insActive, setInsActive] = useState(true);
  const [amefipActive, setAmefipActive] = useState(true);
  const [watershedOverlay, setWatershedOverlay] = useState(false);
  const [agriZoneOverlay, setAgriZoneOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const mapViewTrackedRef = React.useRef(false);

  React.useEffect(() => {
    if (isLoading || isError || mapViewTrackedRef.current) return;
    mapViewTrackedRef.current = true;
    void sendCitizenEngagementEvent({
      eventName: "map_viewed",
      routeTemplate: "/map",
      entrySurface: "map",
    });
  }, [isError, isLoading]);

  // Sync center and zoom when project selection changes
  const handleSelectProject = (pin: PublicMapPin | null) => {
    setSelectedProject(pin);
    if (pin) {
      void sendCitizenEngagementEvent({
        eventName: "map_project_opened",
        routeTemplate: "/map",
        resourceId: pin.id,
        entrySurface: "map",
      });
      setMapCenter([pin.lat, pin.lng]);
      setMapZoom(12);
    }
  };

  const handleZoomIn = () => {
    setMapZoom((z) => Math.min(z + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom((z) => Math.max(z - 1, 3));
  };

  const handleMaximize = () => {
    setSelectedProject(null);
    setMapCenter(defaultCenter);
    setMapZoom(defaultZoom);
  };

  const filteredPins = mapProjects.filter((pin) => {
    if (pin.type === "ins" && !insActive) return false;
    if (pin.type === "amefip" && !amefipActive) return false;
    if (searchQuery && !pin.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col md:flex-row relative overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Side Control Panel */}
      <aside className="w-full md:w-80 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between z-10 shadow-md shrink-0">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" /> {t("directory.infraMap.title")}
            </h2>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label={t("directory.infraMap.searchPlaceholder")}
              placeholder={t("directory.infraMap.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-5">
            {/* Program Toggles */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                {t("directory.infraMap.programLayers")}
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insActive}
                    onChange={() => setInsActive(!insActive)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  {t("directory.infraMap.insProjects")}
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={amefipActive}
                    onChange={() => setAmefipActive(!amefipActive)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  {t("directory.infraMap.amefipProjects")}
                </label>
              </div>
            </div>

            {/* Shapefile Layers */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                {t("directory.infraMap.overlays")}
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watershedOverlay}
                    onChange={() => setWatershedOverlay(!watershedOverlay)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  {t("directory.infraMap.watersheds")}
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agriZoneOverlay}
                    onChange={() => setAgriZoneOverlay(!agriZoneOverlay)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  {t("directory.infraMap.agriZones")}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] space-y-2 text-slate-500 dark:text-slate-400 mt-6">
          <span className="font-extrabold text-slate-700 dark:text-slate-300 uppercase block">
            {t("directory.infraMap.legendTitle")}
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary block" /> {t("directory.infraMap.legend.completed")}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> {t("directory.infraMap.legend.ongoing")}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" /> {t("directory.infraMap.legend.planned")}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 block" /> {t("directory.infraMap.legend.suspended")}
          </div>
        </div>
      </aside>

      {/* Main Map View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-900">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300"><Loader2 className="h-8 w-8 animate-spin text-primary" />{t("directory.infraMap.loadingProjects")}</div>
        ) : isError ? (
          <div role="alert" className="max-w-md rounded-xl border border-rose-200 bg-white p-5 text-center text-sm text-rose-700 shadow dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300">{t("directory.infraMap.unavailable")}</div>
        ) : (
          <GISMapCanvas
            filteredPins={filteredPins}
            selectedProject={selectedProject}
            setSelectedProject={handleSelectProject}
            watershedOverlay={watershedOverlay}
            agriZoneOverlay={agriZoneOverlay}
            theme={(resolvedTheme as "light" | "dark") || "light"}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
          />
        )}

        {!isLoading && !isError && (
          <div className="absolute left-4 top-4 z-20 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-xs text-slate-700 shadow backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-200">
            <p className="font-extrabold">{t("directory.infraMap.coordinateBacked", { count: mapProjects.length.toLocaleString() })}</p>
            <p className="mt-1 text-[10px] text-slate-500">{t("directory.infraMap.sourceNote")}</p>
          </div>
        )}

        {/* Selected Project HUD Panel */}
        {selectedProject && (
          <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-20 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xl z-20 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  {selectedProject.id}
                </span>
                <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                  {selectedProject.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                aria-label={t("directory.panel.close")}
                title={t("directory.panel.close")}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 leading-relaxed">
              {selectedProject.desc === MAP_PIN_LOCATION_UNAVAILABLE
                ? t("directory.card.locationUnavailable")
                : selectedProject.desc}
            </p>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{t("directory.infraMap.progress")}</span>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-200">
                  {selectedProject.progress}%
                </span>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  selectedProject.status === "completed"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : selectedProject.status === "ongoing"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : selectedProject.status === "suspended"
                    ? "bg-rose-600/10 text-rose-600 border border-rose-600/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {PIN_STATUS_LABEL_KEYS[selectedProject.status]
                  ? t(PIN_STATUS_LABEL_KEYS[selectedProject.status])
                  : selectedProject.status}
              </span>
            </div>

            <Link
              href={`/projects/${selectedProject.id}?return=${encodeURIComponent("/map")}`}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full bg-primary hover:bg-primary/95 text-white text-xs font-bold h-9 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
              )}
            >
              {t("directory.infraMap.openDetails")} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Map Controls HUD */}
        <div className="absolute right-6 bottom-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl shadow-lg flex flex-col gap-1.5 z-20">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors shadow-sm"
            aria-label={t("directory.infraMap.zoomIn")}
            title={t("directory.infraMap.zoomIn")}
          >
            <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors shadow-sm"
            aria-label={t("directory.infraMap.zoomOut")}
            title={t("directory.infraMap.zoomOut")}
          >
            <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors shadow-sm"
            aria-label={t("directory.infraMap.recenter")}
            title={t("directory.infraMap.recenter")}
          >
            <Maximize className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
