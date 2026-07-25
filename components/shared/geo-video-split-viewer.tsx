"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import {
  Clock3,
  LocateFixed,
  MapPinned,
  Maximize2,
  Minimize2,
  Route,
  Video,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EvidenceBasemapSelector,
  type EvidenceBasemapId,
} from "@/components/shared/evidence-basemap";
import type { EvidenceMapTrack } from "@/components/shared/leaflet-evidence-map";
import type { SystemEvidenceIssue } from "@/components/shared/system-evidence-map-types";
import { interpolateGeoTrackPoint } from "@/lib/geo-track-playback";

const LeafletEvidenceMap = dynamic(
  () => import("@/components/shared/leaflet-evidence-map"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-0 place-items-center bg-slate-100 text-sm font-bold text-slate-500">
        Preparing synchronized route map&hellip;
      </div>
    ),
  },
);

export type GeoVideoSplitViewRequest = {
  issue: SystemEvidenceIssue;
  videoUrl: string;
  initialTime: number;
  initiallyPlaying: boolean;
};

type GeoVideoSplitViewerProps = GeoVideoSplitViewRequest & {
  basemapId: EvidenceBasemapId;
  onBasemapChange: (basemapId: EvidenceBasemapId) => void;
  onClose: () => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function GeoVideoSplitViewer({
  issue,
  videoUrl,
  initialTime,
  initiallyPlaying,
  basemapId,
  onBasemapChange,
  onClose,
}: GeoVideoSplitViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const initialPositionAppliedRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const [followPin, setFollowPin] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);

  const activePoint = useMemo(
    () => interpolateGeoTrackPoint(issue.geoVideoTrack, currentTime, duration),
    [currentTime, duration, issue.geoVideoTrack],
  );
  const tracks = useMemo<EvidenceMapTrack[]>(
    () => [{
      id: `${issue.issueId}-split-route`,
      label: `${issue.ticketNumber} GeoVideo route`,
      points: issue.geoVideoTrack,
    }],
    [issue.geoVideoTrack, issue.issueId, issue.ticketNumber],
  );
  const isTimestampAligned = issue.geoVideoTrack.length > 1
    && issue.geoVideoTrack.every(
      (point) => typeof point.timeSeconds === "number" && Number.isFinite(point.timeSeconds),
    );

  useEffect(() => {
    setFullscreenAvailable(typeof workspaceRef.current?.requestFullscreen === "function");

    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => () => {
    videoRef.current?.pause();
  }, []);

  const reportPlayback = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    setCurrentTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
    setDuration(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0);
  }, []);

  const handleLoadedMetadata = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const nextDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    setDuration(nextDuration);

    if (!initialPositionAppliedRef.current) {
      initialPositionAppliedRef.current = true;
      const maximum = nextDuration > 0 ? nextDuration : initialTime;
      video.currentTime = Math.min(Math.max(initialTime, 0), maximum);
      setCurrentTime(video.currentTime);

      if (initiallyPlaying) {
        void video.play().catch(() => {
          // Browser autoplay policies may require the user to press play.
        });
      }
    }
  }, [initialTime, initiallyPlaying]);

  const handleClose = useCallback(() => {
    videoRef.current?.pause();
    if (document.fullscreenElement === workspaceRef.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
    onClose();
  }, [onClose]);

  const toggleFullscreen = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    if (document.fullscreenElement === workspace) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

    void workspace.requestFullscreen().catch(() => undefined);
  }, []);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="!inset-0 !top-0 !left-0 z-[10000] !h-dvh !w-screen !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden !rounded-none bg-slate-950 !p-0 text-white ring-0 motion-reduce:transition-none sm:!max-w-none"
      >
        <div
          ref={workspaceRef}
          className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-white"
          data-geo-video-split-view
          data-playback-time={currentTime.toFixed(3)}
          data-playback-lat={activePoint?.lat.toFixed(7)}
          data-playback-lon={activePoint?.lon.toFixed(7)}
        >
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950 px-4 py-2.5 shadow-xl shadow-black/20 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
                <Video className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <DialogTitle className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base">
                    Synchronized GeoVideo Review
                  </DialogTitle>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-emerald-300 sm:inline-flex">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Synced
                  </span>
                </div>
                <DialogDescription className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
                  {issue.ticketNumber} &middot; The amber marker follows the video timeline.
                </DialogDescription>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {fullscreenAvailable ? (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label={isFullscreen ? "Exit browser fullscreen" : "Enter browser fullscreen"}
                  title={isFullscreen ? "Exit browser fullscreen" : "Enter browser fullscreen"}
                >
                  {isFullscreen
                    ? <Minimize2 className="size-4" aria-hidden="true" />
                    : <Maximize2 className="size-4" aria-hidden="true" />}
                  <span className="hidden lg:inline">{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-extrabold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Exit split view"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Exit split view</span>
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
            <section
              aria-label="GeoVideo playback"
              className="flex min-h-0 min-w-0 flex-col border-b border-white/10 bg-black md:border-r md:border-b-0"
            >
              <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4">
                <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-300">
                  <Video className="size-3.5 text-amber-300" aria-hidden="true" />
                  GeoVideo playback
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                  {isTimestampAligned
                    ? <Clock3 className="size-3 text-amber-300" aria-hidden="true" />
                    : <Route className="size-3 text-amber-300" aria-hidden="true" />}
                  {isTimestampAligned ? "Metadata timing" : "Proportional timing"}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={`GeoVideo playback for ${issue.ticketNumber}`}
                  className="h-full w-full bg-black object-contain"
                  onLoadedMetadata={handleLoadedMetadata}
                  onDurationChange={reportPlayback}
                  onTimeUpdate={reportPlayback}
                  onSeeking={reportPlayback}
                  onSeeked={reportPlayback}
                  onPlay={reportPlayback}
                  onPause={reportPlayback}
                  onEnded={reportPlayback}
                >
                  Your browser does not support embedded video playback.
                </video>
              </div>

              <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-4 text-[11px] text-slate-300">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <MapPinned className="size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                  <span className="truncate font-mono">
                    {activePoint
                      ? `${activePoint.lat.toFixed(6)}, ${activePoint.lon.toFixed(6)}`
                      : "Waiting for location"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-slate-400">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </section>

            <section
              aria-label="Synchronized route map"
              className="relative min-h-0 min-w-0 overflow-hidden bg-slate-200"
            >
              <LeafletEvidenceMap
                tracks={tracks}
                activePoint={activePoint}
                fitRequestKey={fitRequestKey}
                followActivePoint={followPin}
                basemapId={basemapId}
                className="h-full min-h-0 w-full"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-3 p-3 sm:p-4">
                <div className="rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-slate-900 shadow-lg shadow-slate-900/10 backdrop-blur-md">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Synchronized route map</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-900">
                    {issue.geoVideoTrack.length} GPS point{issue.geoVideoTrack.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                  <EvidenceBasemapSelector
                    value={basemapId}
                    onValueChange={onBasemapChange}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => setFitRequestKey((key) => key + 1)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/60 bg-white/95 px-3 text-xs font-extrabold text-slate-800 shadow-lg shadow-slate-900/10 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    aria-label="Fit the complete GeoVideo route on the map"
                  >
                    <Route className="size-4 text-sky-700" aria-hidden="true" />
                    <span className="hidden sm:inline">Fit route</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowPin((value) => !value)}
                    aria-pressed={followPin}
                    aria-label={followPin ? "Disable follow pin" : "Enable follow pin"}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold shadow-lg shadow-slate-900/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      followPin
                        ? "border-amber-300 bg-amber-400 text-slate-950 hover:bg-amber-300"
                        : "border-white/60 bg-white/95 text-slate-800 hover:bg-white"
                    }`}
                  >
                    <LocateFixed className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Follow pin</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
