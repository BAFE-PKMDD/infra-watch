"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import Link from "next/link";
import { Maximize2 } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
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
import { interpolateGeoTrackPoint } from "@/lib/geo-track-playback";
import { getFullUrl } from "@/lib/minio-url";
import { cn } from "@/lib/utils";
import {
  GeoVideoSplitViewer,
  type GeoVideoSplitViewRequest,
} from "@/components/shared/geo-video-split-viewer";
import {
  getSystemEvidenceLocationLabel,
  type SystemEvidenceIssue,
} from "@/components/shared/system-evidence-map-types";

const PHILIPPINES_CENTER: [number, number] = [12.8797, 121.774];

type SystemEvidenceMapCanvasProps = {
  issues: SystemEvidenceIssue[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
};

type PlaybackSnapshot = {
  playerId: string;
  issueId: string;
  currentTime: number;
  duration: number;
};

type PlaybackUpdateHandler = (snapshot: PlaybackSnapshot) => void;
type PlaybackActivateHandler = (playerId: string) => void;
type PlaybackDisposeHandler = (playerId: string) => void;
type OpenSplitViewHandler = (request: GeoVideoSplitViewRequest) => void;

function formatLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function MapViewport({ issues, selectedIssueId }: Pick<SystemEvidenceMapCanvasProps, "issues" | "selectedIssueId">) {
  const map = useMap();

  const positions = useMemo(
    () => issues.flatMap((issue) => [
      ...issue.evidence.map((item) => [item.lat, item.lon] as [number, number]),
      ...issue.geoVideoTrack.map((point) => [point.lat, point.lon] as [number, number]),
    ]),
    [issues],
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
    if (selectedIssueId) return;

    if (positions.length === 0) {
      map.setView(PHILIPPINES_CENTER, 6, { animate: true });
      return;
    }

    if (positions.length === 1) {
      map.flyTo(positions[0], 15, { duration: 0.65 });
      return;
    }

    map.fitBounds(positions, {
      padding: [48, 48],
      maxZoom: 15,
      animate: true,
      duration: 0.65,
    });
  }, [map, positions, selectedIssueId]);

  useEffect(() => {
    if (!selectedIssueId) return;
    const selected = issues.find((issue) => issue.issueId === selectedIssueId);
    const point = selected?.evidence[0] ?? selected?.geoVideoTrack[0];
    if (point) map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 14), { duration: 0.65 });
  }, [issues, map, selectedIssueId]);

  return null;
}

function GeoVideoPopupPlayer({
  issue,
  playerId,
  videoUrl,
  name,
  synchronized,
  onPlaybackActivate,
  onPlaybackUpdate,
  onPlaybackDispose,
  onOpenSplitView,
}: {
  issue: SystemEvidenceIssue;
  playerId: string;
  videoUrl: string;
  name?: string;
  synchronized: boolean;
  onPlaybackActivate: PlaybackActivateHandler;
  onPlaybackUpdate: PlaybackUpdateHandler;
  onPlaybackDispose: PlaybackDisposeHandler;
  onOpenSplitView?: OpenSplitViewHandler;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!synchronized) return;
    onPlaybackActivate(playerId);
    return () => onPlaybackDispose(playerId);
  }, [onPlaybackActivate, onPlaybackDispose, playerId, synchronized]);

  const reportPlayback = (event: SyntheticEvent<HTMLVideoElement>) => {
    if (!synchronized) return;
    const video = event.currentTarget;
    onPlaybackUpdate({
      playerId,
      issueId: issue.issueId,
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
      duration: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0,
    });
  };

  const handleOpenSplitView = () => {
    const video = videoRef.current;
    const initialTime = video && Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const initiallyPlaying = Boolean(video && !video.paused && !video.ended);
    video?.pause();
    onOpenSplitView?.({ issue, videoUrl, initialTime, initiallyPlaying });
  };

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg shadow-slate-950/20">
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        controls
        autoPlay
        muted
        playsInline
        preload="none"
        aria-label={name || `GeoVideo evidence for ${issue.ticketNumber}`}
        className="aspect-video w-full bg-black object-contain"
        onLoadedMetadata={reportPlayback}
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
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent p-2 pb-7 text-white">
        <span className="rounded-md border border-white/15 bg-slate-950/75 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] backdrop-blur-sm">
          GeoVideo evidence
        </span>
        {synchronized ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/25 bg-amber-950/85 px-2 py-1 text-[9px] font-bold text-amber-100 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.2)]" />
            Pin synced &middot; {issue.geoVideoTrack.length} GPS points
          </span>
        ) : null}
      </div>
      {synchronized && onOpenSplitView ? (
        <div className="border-t border-white/10 bg-slate-950 p-2">
          <button
            type="button"
            onClick={handleOpenSplitView}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-3 text-xs font-extrabold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
            Open split view
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IssuePopup({
  issue,
  mediaIndex,
  playerId,
  onPlaybackActivate,
  onPlaybackUpdate,
  onPlaybackDispose,
  onOpenSplitView,
}: {
  issue: SystemEvidenceIssue;
  mediaIndex?: number;
  playerId: string;
  onPlaybackActivate: PlaybackActivateHandler;
  onPlaybackUpdate: PlaybackUpdateHandler;
  onPlaybackDispose: PlaybackDisposeHandler;
  onOpenSplitView: OpenSplitViewHandler;
}) {
  const media = mediaIndex === undefined ? null : issue.evidence[mediaIndex];
  const fullUrl = media ? getFullUrl(media.url) : issue.geoVideoUrl ? getFullUrl(issue.geoVideoUrl) : null;
  const videoUrl = media?.type === "video"
    ? fullUrl
    : media === null && issue.geoVideoTrack.length > 0
      ? fullUrl
      : null;
  const synchronized = Boolean(
    videoUrl
    && issue.geoVideoTrack.length > 0
    && issue.geoVideoUrl
    && getFullUrl(issue.geoVideoUrl) === videoUrl
  );

  return (
    <div className="w-[min(23rem,76vw)] overflow-hidden text-slate-900">
      {media?.type === "image" && fullUrl ? (
        // Leaflet popups are client-only and can display MinIO/object URLs directly.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fullUrl} alt={media.name || "Geotagged issue evidence"} className="mb-3 h-28 w-full rounded-lg object-cover" />
      ) : videoUrl ? (
        <GeoVideoPopupPlayer
          issue={issue}
          playerId={playerId}
          videoUrl={videoUrl}
          name={media?.name}
          synchronized={synchronized}
          onPlaybackActivate={onPlaybackActivate}
          onPlaybackUpdate={onPlaybackUpdate}
          onPlaybackDispose={onPlaybackDispose}
          onOpenSplitView={synchronized ? onOpenSplitView : undefined}
        />
      ) : null}

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
          {issue.ticketNumber}
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
          {formatLabel(issue.category)}
        </span>
      </div>
      <p className="line-clamp-3 text-sm font-semibold leading-5">{issue.description}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-4 text-slate-500">{getSystemEvidenceLocationLabel(issue)}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <span className="text-[11px] font-medium text-slate-500">{formatDate(issue.createdAt)}</span>
        <Link
          href={issue.detailUrl}
          className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {issue.sourceType === "feedback" ? "Open feedback" : "Open report"}
        </Link>
      </div>
    </div>
  );
}

const IssueLayers = memo(function IssueLayers({
  issues,
  selectedIssueId,
  onSelectIssue,
  onPlaybackActivate,
  onPlaybackUpdate,
  onPlaybackDispose,
  onOpenSplitView,
}: SystemEvidenceMapCanvasProps & {
  onPlaybackActivate: PlaybackActivateHandler;
  onPlaybackUpdate: PlaybackUpdateHandler;
  onPlaybackDispose: PlaybackDisposeHandler;
  onOpenSplitView: OpenSplitViewHandler;
}) {
  const map = useMap();
  const handleOpenSplitView = useCallback<OpenSplitViewHandler>((request) => {
    onOpenSplitView(request);
    map.closePopup();
  }, [map, onOpenSplitView]);

  return issues.map((issue) => {
    const selected = issue.issueId === selectedIssueId;
    const trackPositions = issue.geoVideoTrack.map((point) => [point.lat, point.lon] as [number, number]);
    const routePlayerId = `${issue.issueId}:route`;
    const startPlayerId = `${issue.issueId}:start`;

    return (
      <Fragment key={issue.issueId}>
        {trackPositions.length > 1 && (
          <Polyline
            positions={trackPositions}
            pathOptions={{
              color: selected ? "#0f766e" : "#0284c7",
              weight: selected ? 6 : 4,
              opacity: selected ? 1 : 0.78,
              lineCap: "round",
              lineJoin: "round",
            }}
            eventHandlers={{ click: () => onSelectIssue(issue.issueId) }}
          >
            <Popup
              maxWidth={420}
              eventHandlers={{ remove: () => onPlaybackDispose(routePlayerId) }}
            >
              <IssuePopup
                issue={issue}
                playerId={routePlayerId}
                onPlaybackActivate={onPlaybackActivate}
                onPlaybackUpdate={onPlaybackUpdate}
                onPlaybackDispose={onPlaybackDispose}
                onOpenSplitView={handleOpenSplitView}
              />
            </Popup>
          </Polyline>
        )}

        {trackPositions.length > 0 && (
          <CircleMarker
            center={trackPositions[0]}
            radius={selected ? 7 : 5}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0284c7", fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectIssue(issue.issueId) }}
          >
            <Popup
              maxWidth={420}
              eventHandlers={{ remove: () => onPlaybackDispose(startPlayerId) }}
            >
              <IssuePopup
                issue={issue}
                playerId={startPlayerId}
                onPlaybackActivate={onPlaybackActivate}
                onPlaybackUpdate={onPlaybackUpdate}
                onPlaybackDispose={onPlaybackDispose}
                onOpenSplitView={handleOpenSplitView}
              />
            </Popup>
          </CircleMarker>
        )}

        {issue.evidence.map((media, mediaIndex) => {
          const mediaPlayerId = `${issue.issueId}:media:${mediaIndex}:${media.url}`;
          return (
            <CircleMarker
              key={`${issue.issueId}-${media.type}-${mediaIndex}-${media.lat}-${media.lon}`}
              center={[media.lat, media.lon]}
              radius={selected ? 10 : media.type === "video" ? 8 : 7}
              pathOptions={{
                color: selected ? "#0f172a" : "#ffffff",
                weight: selected ? 4 : 2,
                fillColor: media.type === "video" ? "#0284c7" : "#10b981",
                fillOpacity: 0.94,
              }}
              eventHandlers={{ click: () => onSelectIssue(issue.issueId) }}
            >
              <Popup
                maxWidth={420}
                eventHandlers={{ remove: () => onPlaybackDispose(mediaPlayerId) }}
              >
                <IssuePopup
                  issue={issue}
                  mediaIndex={mediaIndex}
                  playerId={mediaPlayerId}
                  onPlaybackActivate={onPlaybackActivate}
                  onPlaybackUpdate={onPlaybackUpdate}
                  onPlaybackDispose={onPlaybackDispose}
                  onOpenSplitView={handleOpenSplitView}
                />
              </Popup>
            </CircleMarker>
          );
        })}
      </Fragment>
    );
  });
});

export default function SystemEvidenceMapCanvas({
  issues,
  selectedIssueId,
  onSelectIssue,
}: SystemEvidenceMapCanvasProps) {
  const [playback, setPlayback] = useState<PlaybackSnapshot | null>(null);
  const [splitViewRequest, setSplitViewRequest] = useState<GeoVideoSplitViewRequest | null>(null);
  const [basemapId, setBasemapId] = useState<EvidenceBasemapId>(DEFAULT_EVIDENCE_BASEMAP_ID);
  const [basemapRevision, setBasemapRevision] = useState(0);
  const [basemapMessage, setBasemapMessage] = useState<string | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);
  const activeBasemapIdRef = useRef<EvidenceBasemapId>(DEFAULT_EVIDENCE_BASEMAP_ID);
  const tileErrorCountRef = useRef(0);
  const automaticFallbackAttemptedRef = useRef(false);

  const handleBasemapChange = useCallback((nextBasemapId: EvidenceBasemapId) => {
    tileErrorCountRef.current = 0;
    automaticFallbackAttemptedRef.current = false;
    activeBasemapIdRef.current = nextBasemapId;
    setBasemapMessage(null);
    if (nextBasemapId === basemapId) {
      setBasemapRevision((revision) => revision + 1);
    } else {
      setBasemapId(nextBasemapId);
    }
  }, [basemapId]);

  const handleBasemapLoading = useCallback(() => {
    if (activeBasemapIdRef.current !== basemapId) return;
    tileErrorCountRef.current = 0;
  }, [basemapId]);

  const handleBasemapLoad = useCallback(() => {
    if (activeBasemapIdRef.current !== basemapId) return;
    tileErrorCountRef.current = 0;
  }, [basemapId]);

  const handleBasemapTileError = useCallback(() => {
    if (activeBasemapIdRef.current !== basemapId) return;
    tileErrorCountRef.current += 1;
    if (tileErrorCountRef.current < 3) return;

    if (automaticFallbackAttemptedRef.current) {
      setBasemapMessage("Basemap tiles are unavailable. Choose another map style to try again.");
      return;
    }

    automaticFallbackAttemptedRef.current = true;
    const fallbackId: EvidenceBasemapId = basemapId === "streets" ? "satellite" : "streets";
    activeBasemapIdRef.current = fallbackId;
    tileErrorCountRef.current = 0;
    setBasemapMessage(`${EVIDENCE_BASEMAPS[basemapId].label} tiles were unavailable, so ${EVIDENCE_BASEMAPS[fallbackId].label} is shown instead.`);
    setBasemapId(fallbackId);
  }, [basemapId]);

  const handlePlaybackActivate = useCallback<PlaybackActivateHandler>((playerId) => {
    activePlayerIdRef.current = playerId;
    setPlayback((current) => current?.playerId === playerId ? current : null);
  }, []);

  const handlePlaybackUpdate = useCallback<PlaybackUpdateHandler>((snapshot) => {
    if (activePlayerIdRef.current !== snapshot.playerId) return;
    setPlayback((current) => (
      current
      && current.playerId === snapshot.playerId
      && current.issueId === snapshot.issueId
      && Math.abs(current.currentTime - snapshot.currentTime) < 0.01
      && current.duration === snapshot.duration
        ? current
        : snapshot
    ));
  }, []);

  const handlePlaybackDispose = useCallback<PlaybackDisposeHandler>((playerId) => {
    if (activePlayerIdRef.current !== playerId) return;
    activePlayerIdRef.current = null;
    setPlayback(null);
  }, []);

  const handleOpenSplitView = useCallback<OpenSplitViewHandler>((request) => {
    setSplitViewRequest(request);
  }, []);

  const handleCloseSplitView = useCallback(() => {
    setSplitViewRequest(null);
  }, []);

  const activePlaybackPoint = useMemo(() => {
    if (!playback) return null;
    const issue = issues.find((candidate) => candidate.issueId === playback.issueId);
    return issue
      ? interpolateGeoTrackPoint(issue.geoVideoTrack, playback.currentTime, playback.duration)
      : null;
  }, [issues, playback]);

  return (
    <div
      role="region"
      aria-label="Map of geotagged issue evidence"
      data-playback-time={playback?.currentTime.toFixed(3)}
      data-playback-lat={activePlaybackPoint?.lat.toFixed(7)}
      data-playback-lon={activePlaybackPoint?.lon.toFixed(7)}
      className={cn(
        "relative isolate h-full min-h-[28rem] w-full bg-slate-200 dark:bg-slate-900",
        basemapId === "streets" && "dark:[&_.leaflet-tile-pane]:brightness-[0.72] dark:[&_.leaflet-tile-pane]:contrast-[1.12]",
        basemapId === "terrain" && "dark:[&_.leaflet-tile-pane]:brightness-[0.82] dark:[&_.leaflet-tile-pane]:contrast-[1.08]",
      )}
    >
      <MapContainer
        center={PHILIPPINES_CENTER}
        zoom={6}
        minZoom={4}
        maxZoom={EVIDENCE_BASEMAPS[DEFAULT_EVIDENCE_BASEMAP_ID].maxZoom}
        zoomControl
        preferCanvas
        className="h-full w-full"
      >
        <EvidenceBasemapLayer
          basemapId={basemapId}
          revision={basemapRevision}
          onLoading={handleBasemapLoading}
          onLoad={handleBasemapLoad}
          onTileError={handleBasemapTileError}
        />
        <MapViewport issues={issues} selectedIssueId={selectedIssueId} />

        <IssueLayers
          issues={issues}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
          onPlaybackActivate={handlePlaybackActivate}
          onPlaybackUpdate={handlePlaybackUpdate}
          onPlaybackDispose={handlePlaybackDispose}
          onOpenSplitView={handleOpenSplitView}
        />

        {activePlaybackPoint ? (
          <>
            <CircleMarker
              center={[activePlaybackPoint.lat, activePlaybackPoint.lon]}
              radius={13}
              pathOptions={{ color: "#f59e0b", weight: 2, fillColor: "#fbbf24", fillOpacity: 0.22 }}
              interactive={false}
            />
            <CircleMarker
              center={[activePlaybackPoint.lat, activePlaybackPoint.lon]}
              radius={7}
              pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#f59e0b", fillOpacity: 1 }}
              interactive={false}
            />
          </>
        ) : null}
      </MapContainer>

      <EvidenceBasemapSelector
        value={basemapId}
        onValueChange={handleBasemapChange}
        className="absolute right-3 top-20 z-[850] lg:top-4"
      />

      <p
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute right-3 top-32 z-[900] max-w-72 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs font-bold text-amber-950 shadow-lg backdrop-blur transition-opacity lg:top-16 dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100",
          basemapMessage ? "opacity-100" : "opacity-0",
        )}
      >
        {basemapMessage ?? ""}
      </p>

      {splitViewRequest ? (
        <GeoVideoSplitViewer
          key={`${splitViewRequest.issue.issueId}:${splitViewRequest.videoUrl}`}
          {...splitViewRequest}
          basemapId={basemapId}
          onBasemapChange={handleBasemapChange}
          onClose={handleCloseSplitView}
        />
      ) : null}
    </div>
  );
}
