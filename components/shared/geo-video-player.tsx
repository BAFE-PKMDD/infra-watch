"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Clock3, MapPinned, Route, Video } from "lucide-react";

import type { EvidenceMapTrack } from "@/components/shared/leaflet-evidence-map";
import { interpolateGeoTrackPoint } from "@/lib/geo-track-playback";
import { getFullUrl } from "@/lib/minio-url";
import type { GeoTrackPoint } from "@/types/geo-evidence.types";

const LeafletEvidenceMap = dynamic(
  () => import("@/components/shared/leaflet-evidence-map"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-72 place-items-center bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Preparing route map&hellip;
      </div>
    ),
  },
);

type GeoVideoPlayerProps = {
  url: string;
  track: GeoTrackPoint[];
  name?: string;
  className?: string;
};

function isValidPoint(point: GeoTrackPoint) {
  return Number.isFinite(point.lat)
    && point.lat >= -90
    && point.lat <= 90
    && Number.isFinite(point.lon)
    && point.lon >= -180
    && point.lon <= 180;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function GeoVideoPlayer({ url, track, name = "GeoVideo evidence", className }: GeoVideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoUrl = getFullUrl(url) || url;
  const validPoints = useMemo(() => track.filter(isValidPoint), [track]);
  const activePoint = useMemo(
    () => interpolateGeoTrackPoint(validPoints, currentTime, duration),
    [currentTime, duration, validPoints],
  );
  const tracks = useMemo<EvidenceMapTrack[]>(
    () => validPoints.length > 0 ? [{ id: "geo-video-track", label: name, points: validPoints }] : [],
    [name, validPoints],
  );
  const isTimestampAligned = validPoints.length > 1
    && validPoints.every((point) => typeof point.timeSeconds === "number" && Number.isFinite(point.timeSeconds));

  if (validPoints.length === 0) return null;

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-700 ${className ?? ""}`}>
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-400/15 text-amber-300">
              <Video className="size-4" />
            </span>
            {name}
          </h3>
          <p className="mt-1 text-xs text-slate-400">Video playback paired with its recorded route.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
          {isTimestampAligned ? <Clock3 className="size-3" /> : <Route className="size-3" />}
          {isTimestampAligned ? "Metadata timing" : "Proportional route timing"}
        </span>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="flex min-h-72 items-center bg-black">
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-[34rem] w-full bg-black object-contain"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
          >
            Your browser does not support embedded video playback.
          </video>
        </div>
        <div className="min-h-72 border-t border-white/10 lg:border-l lg:border-t-0">
          <LeafletEvidenceMap
            tracks={tracks}
            activePoint={activePoint}
            showBasemapSelector
            basemapSelectorCompact
            className="h-full min-h-72 w-full"
          />
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-3 text-xs text-slate-300 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <MapPinned className="size-4 shrink-0 text-amber-300" />
          <span className="truncate">
            {activePoint
              ? `${activePoint.lat.toFixed(6)}, ${activePoint.lon.toFixed(6)}`
              : "Waiting for video metadata"}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          {formatTime(currentTime)} / {formatTime(duration)} &middot; {validPoints.length} GPS point{validPoints.length === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
}
