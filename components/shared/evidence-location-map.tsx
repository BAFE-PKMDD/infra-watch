"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Camera, MapPin, Route, Video } from "lucide-react";

import type { EvidenceMapPoint, EvidenceMapTrack } from "@/components/shared/leaflet-evidence-map";
import type { GeoTrackPoint, StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

const LeafletEvidenceMap = dynamic(
  () => import("@/components/shared/leaflet-evidence-map"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-80 w-full place-items-center bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading evidence map&hellip;
      </div>
    ),
  },
);

type EvidenceLocationMapProps = {
  evidence?: StoredIssueEvidenceItem[] | null;
  geoVideoTrack?: GeoTrackPoint[] | null;
  geoVideoUrl?: string | null;
  className?: string;
  scrollTargetPrefix?: string;
  onEvidenceSelect?: (index: number) => void;
};

function hasValidCoordinates(item: StoredIssueEvidenceItem) {
  return typeof item.lat === "number"
    && Number.isFinite(item.lat)
    && item.lat >= -90
    && item.lat <= 90
    && typeof item.lon === "number"
    && Number.isFinite(item.lon)
    && item.lon >= -180
    && item.lon <= 180;
}

function validTrack(track: GeoTrackPoint[] | null | undefined) {
  return (track ?? []).filter((point) => (
    Number.isFinite(point.lat)
    && point.lat >= -90
    && point.lat <= 90
    && Number.isFinite(point.lon)
    && point.lon >= -180
    && point.lon <= 180
  ));
}

export function EvidenceLocationMap({
  evidence,
  geoVideoTrack,
  geoVideoUrl,
  className,
  scrollTargetPrefix = "evidence",
  onEvidenceSelect,
}: EvidenceLocationMapProps) {
  const { points, tracks, pointIndex } = useMemo(() => {
    const nextPoints: EvidenceMapPoint[] = [];
    const nextIndex = new Map<string, number>();

    (evidence ?? []).forEach((item, index) => {
      if (!hasValidCoordinates(item)) return;
      const id = `evidence-point-${index}`;
      nextIndex.set(id, index);
      nextPoints.push({
        id,
        label: item.name || `${item.type === "video" ? "Video" : "Photo"} evidence ${index + 1}`,
        type: item.type === "video" ? "video" : "image",
        lat: item.lat as number,
        lon: item.lon as number,
        accuracy: item.accuracy,
      });
    });

    const trackPoints = validTrack(geoVideoTrack);
    const nextTracks: EvidenceMapTrack[] = trackPoints.length > 0
      ? [{ id: "geo-video-track", label: "GeoVideo route", points: trackPoints }]
      : [];

    return { points: nextPoints, tracks: nextTracks, pointIndex: nextIndex };
  }, [evidence, geoVideoTrack]);

  if (points.length === 0 && tracks.length === 0) return null;

  const handlePointSelect = (id: string) => {
    const index = pointIndex.get(id);
    if (index === undefined) return;

    onEvidenceSelect?.(index);
    const target = document.getElementById(`${scrollTargetPrefix}-${index}`);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("ring-4", "ring-emerald-400/50");
    window.setTimeout(() => target.classList.remove("ring-4", "ring-emerald-400/50"), 1800);
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className ?? ""}`}>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-white">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MapPin className="size-4" />
            </span>
            Evidence locations
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select a pin to jump to its evidence file.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
            <Camera className="size-3" />
            {points.filter((point) => point.type === "image").length} photo pins
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
            {tracks.length > 0 ? <Route className="size-3" /> : <Video className="size-3" />}
            {tracks.length > 0 ? `${tracks[0].points.length} route points` : `${points.filter((point) => point.type === "video").length} video pins`}
          </span>
        </div>
      </div>
      <LeafletEvidenceMap
        points={points}
        tracks={tracks}
        onPointSelect={handlePointSelect}
        showBasemapSelector
      />
      {geoVideoUrl && tracks.length > 0 ? (
        <div className="border-t border-slate-200 bg-amber-50/70 px-4 py-2 text-[11px] font-semibold text-amber-800 dark:border-slate-800 dark:bg-amber-500/5 dark:text-amber-200">
          The amber line is the route attached to the GeoVideo evidence.
        </div>
      ) : null}
    </section>
  );
}
