"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Compass, Search, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

// Dynamically import Leaflet Map Component with SSR disabled
const GISMapCanvas = dynamic(
  () => import("@/components/map/gis-map-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center text-xs font-semibold text-slate-500 animate-pulse">
        Loading Map Console...
      </div>
    ),
  }
);

// Real coordinates for Visayas projects
const mapProjects = [
  { id: "PRJ-INS-2023-009", name: "Dingle Diversion Dam Rehabilitation", lat: 10.7431, lng: 125.0135, status: "completed", type: "ins", desc: "Abuyog, Leyte • ₱14.0M", progress: 100 },
  { id: "PRJ-AMSS-2024-042", name: "Post-Harvest Grain Dryer", lat: 10.4503, lng: 123.7228, status: "ongoing", type: "amss", desc: "Balamban, Cebu • ₱1.8M", progress: 75 },
  { id: "PRJ-INS-2025-115", name: "Solar Powered Irrigation Pump", lat: 10.7188, lng: 125.0298, status: "ongoing", type: "ins", desc: "Abuyog, Leyte • ₱4.2M", progress: 85 },
  { id: "PRJ-AMSS-2026-002", name: "Agricultural Warehouse", lat: 11.2789, lng: 125.0673, status: "planned", type: "amss", desc: "Basey, Samar • ₱5.2M", progress: 0 },
  { id: "PRJ-INS-2024-108", name: "Concrete Drainage Canal", lat: 11.3115, lng: 125.0890, status: "suspended", type: "ins", desc: "Basey, Samar • ₱3.1M", progress: 40 },
];

const defaultCenter: [number, number] = [10.74, 124.79]; // Visayas center
const defaultZoom = 8.5;

export default function GISMapPage() {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  const [selectedProject, setSelectedProject] = useState<typeof mapProjects[0] | null>(null);
  const [insActive, setInsActive] = useState(true);
  const [amssActive, setAmssActive] = useState(true);
  const [watershedOverlay, setWatershedOverlay] = useState(false);
  const [agriZoneOverlay, setAgriZoneOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);

  // Sync center and zoom when project selection changes
  const handleSelectProject = (pin: typeof mapProjects[0] | null) => {
    setSelectedProject(pin);
    if (pin) {
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
    if (pin.type === "amss" && !amssActive) return false;
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
              <Compass className="w-5 h-5 text-primary" /> GIS Mapping Console
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
              Overlay AMEFIP program projects with administrative boundaries and GeoServer GIS data.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search map markers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary text-slate-850 dark:text-slate-100"
            />
          </div>

          <div className="space-y-5">
            {/* Program Toggles */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                Program Layers
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insActive}
                    onChange={() => setInsActive(!insActive)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  INS Projects (Irrigation)
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={amssActive}
                    onChange={() => setAmssActive(!amssActive)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  AMSS Projects (Machinery)
                </label>
              </div>
            </div>

            {/* Shapefile Layers */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                GeoServer Shapefile Overlays
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watershedOverlay}
                    onChange={() => setWatershedOverlay(!watershedOverlay)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  Watersheds Boundary
                </label>
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agriZoneOverlay}
                    onChange={() => setAgriZoneOverlay(!agriZoneOverlay)}
                    className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary w-4 h-4"
                  />
                  Agricultural Land Zones
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-50/70 dark:bg-slate-850/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] space-y-2 text-slate-500 dark:text-slate-400 mt-6">
          <span className="font-extrabold text-slate-750 dark:text-slate-300 uppercase block">
            Map Legend
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary block" /> Completed (Steel Blue)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" /> Ongoing (Amber)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-450 block" /> Planned (Slate)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 block" /> Suspended (Rose)
          </div>
        </div>
      </aside>

      {/* Main Map View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-900">
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
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 leading-relaxed">
              {selectedProject.desc}
            </p>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-450">Progress:</span>
                <span className="font-bold font-mono text-slate-850 dark:text-slate-200">
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
                {selectedProject.status}
              </span>
            </div>

            <Link
              href={`/projects/${selectedProject.id}`}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full bg-primary hover:bg-primary/95 text-white text-xs font-bold h-9 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
              )}
            >
              Open Project Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Map Controls HUD */}
        <div className="absolute right-6 bottom-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl shadow-lg flex flex-col gap-1.5 z-20">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors shadow-sm"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-350" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors shadow-sm"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-350" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors shadow-sm"
            title="Recenter Map"
          >
            <Maximize className="w-4 h-4 text-slate-600 dark:text-slate-350" />
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
