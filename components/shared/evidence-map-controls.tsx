"use client";

import type { ReactNode } from "react";
import { Camera, Info, Locate, Minus, Plus, Route, Video } from "lucide-react";
import { useMap } from "react-leaflet";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MAP_CONTROL_SURFACE_CLASS } from "@/components/shared/evidence-basemap";

function ControlButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 items-center justify-center text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:text-slate-200 dark:hover:bg-slate-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ZoomFitControl({
  className,
  onFitRequest,
}: {
  className?: string;
  onFitRequest: () => void;
}) {
  const map = useMap();

  return (
    <div
      role="group"
      aria-label="Map zoom and fit controls"
      className={cn(
        "flex flex-col divide-y divide-slate-200 overflow-hidden rounded-md dark:divide-slate-700",
        MAP_CONTROL_SURFACE_CLASS,
        className,
      )}
    >
      <ControlButton label="Zoom in" onClick={() => map.zoomIn()}>
        <Plus className="size-4" />
      </ControlButton>
      <ControlButton label="Zoom out" onClick={() => map.zoomOut()}>
        <Minus className="size-4" />
      </ControlButton>
      <ControlButton label="Fit to reports" onClick={onFitRequest}>
        <Locate className="size-4" />
      </ControlButton>
    </div>
  );
}

export function LegendPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:text-slate-200 dark:hover:bg-slate-800",
          MAP_CONTROL_SURFACE_CLASS,
          className,
        )}
      >
        <Info className="size-4" />
        Legend
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2 text-xs">
        <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Map legend</p>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Camera className="size-3.5 shrink-0 text-[#10b981]" /> Photo evidence
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Video className="size-3.5 shrink-0 text-[#0284c7]" /> Video evidence
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Route className="size-3.5 shrink-0 text-[#0284c7]" /> GeoVideo route
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="size-2.5 shrink-0 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
          Live video position
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">N</span>
          Clustered reports
        </div>
      </PopoverContent>
    </Popover>
  );
}
