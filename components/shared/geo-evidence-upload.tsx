"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  CheckCircle2,
  CircleStop,
  Crosshair,
  FileUp,
  Images,
  Loader2,
  LocateFixed,
  MapPin,
  Radio,
  Trash2,
  TriangleAlert,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { EvidenceMapPoint, EvidenceMapTrack } from "@/components/shared/leaflet-evidence-map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGeolocation, type GeoPosition } from "@/hooks/use-geolocation";
import {
  geoEvidencePairingKey,
  GPS_INFO_ACCEPT,
  isDaGeoCameraVideo,
  isGpsInfoSidecar,
} from "@/lib/geo-sidecar-file";
import type { GeoSidecarExtractionResult } from "@/lib/geo-sidecar-parser";
import { isAllowedClientUploadType, UPLOAD_ACCEPT, uploadKindFromType } from "@/lib/upload-policy";
import { cn } from "@/lib/utils";
import type { GeoTrackPoint } from "@/types/geo-evidence.types";

const LeafletEvidenceMap = dynamic(
  () => import("@/components/shared/leaflet-evidence-map"),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-slate-100 dark:bg-slate-950" />,
  },
);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const GEO_EVIDENCE_ACCEPT = `${UPLOAD_ACCEPT},${GPS_INFO_ACCEPT}`;

export type GeoEvidenceReadyItem = {
  file: File;
  type: "image" | "video";
  lat: number | null;
  lon: number | null;
  accuracy?: number;
  track?: GeoTrackPoint[];
};

type InternalEvidenceItem = GeoEvidenceReadyItem & {
  id: string;
  preview: string;
  status: "extracting" | "ready";
  source: "upload" | "camera";
  locationSource?: "embedded" | "da-sidecar" | "browser" | "manual";
  sidecarName?: string;
  warning?: string;
};

type ParsedSidecar = {
  key: string;
  fileName: string;
  result?: GeoSidecarExtractionResult;
  error?: string;
};

function attachDaSidecar(item: InternalEvidenceItem, sidecar: ParsedSidecar): InternalEvidenceItem {
  if (!sidecar.result?.hasGeoData || sidecar.result.track.length === 0) {
    return {
      ...item,
      status: "ready",
      warning: typeof item.lat === "number" && typeof item.lon === "number"
        ? item.warning
        : `DA GPS route could not be read: ${sidecar.error ?? "No coordinates were found."}`,
    };
  }

  const first = sidecar.result.track[0];
  return {
    ...item,
    status: "ready",
    lat: first.lat,
    lon: first.lon,
    accuracy: first.accuracy,
    track: sidecar.result.track,
    locationSource: "da-sidecar",
    sidecarName: sidecar.fileName,
    warning: undefined,
  };
}

type CameraMode = "photo" | "video";
type CameraLocationStatus = "idle" | "locating" | "ready" | "error";

interface GeoEvidenceUploadProps {
  onEvidenceReady: (items: GeoEvidenceReadyItem[]) => void;
  onProcessingChange?: (processing: boolean) => void;
  initialItems?: GeoEvidenceReadyItem[];
  maxFiles?: number;
  disabled?: boolean;
  compact?: boolean;
}

function uniqueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function fileExtension(mimeType: string) {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

function positionToTrack(position: GeoPosition | null): GeoTrackPoint[] | undefined {
  if (!position) return undefined;
  return [{ lat: position.lat, lon: position.lon, accuracy: position.accuracy, timeSeconds: 0 }];
}

function resolveWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export function GeoEvidenceUpload({
  onEvidenceReady,
  onProcessingChange,
  initialItems = [],
  maxFiles = 5,
  disabled = false,
  compact = false,
}: GeoEvidenceUploadProps) {
  const inputId = useId();
  const cameraGpsStatusId = `${inputId}-camera-gps-status`;
  const [items, setItems] = useState<InternalEvidenceItem[]>(() => initialItems.map((item) => ({
    ...item,
    id: uniqueId(),
    preview: URL.createObjectURL(item.file),
    status: "ready",
    source: "upload",
    locationSource: typeof item.lat === "number" && typeof item.lon === "number"
      ? "embedded"
      : undefined,
    warning: typeof item.lat === "number" && typeof item.lon === "number"
      ? undefined
      : "No embedded GPS was found.",
  })));
  const [cameraMode, setCameraMode] = useState<CameraMode | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<GeoPosition | null>(null);
  const [cameraLocationStatus, setCameraLocationStatus] = useState<CameraLocationStatus>("idle");
  const [cameraLocationError, setCameraLocationError] = useState<string | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPointCount, setRecordingPointCount] = useState(0);
  const [locatingItemId, setLocatingItemId] = useState<string | null>(null);
  const [sidecarProcessing, setSidecarProcessing] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const locationPromiseRef = useRef<Promise<GeoPosition | null> | null>(null);
  const cameraPositionRef = useRef<GeoPosition | null>(null);
  const recordingLocationPromiseRef = useRef<Promise<GeoTrackPoint | null> | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const recordingTrackRef = useRef<GeoTrackPoint[]>([]);
  const recordingActiveRef = useRef(false);
  const captureBusyRef = useRef(false);
  const cameraSessionRef = useRef(0);
  const previewUrlsRef = useRef(new Set(items.map((item) => item.preview)));
  const onEvidenceReadyRef = useRef(onEvidenceReady);
  const onProcessingChangeRef = useRef(onProcessingChange);
  const { capture: captureLocation } = useGeolocation();

  const requestCameraLocation = useCallback((session: number) => {
    cameraPositionRef.current = null;
    setCameraPosition(null);
    setCameraLocationStatus("locating");
    setCameraLocationError(null);

    const request = captureLocation()
      .then((position) => {
        if (cameraSessionRef.current === session) {
          cameraPositionRef.current = position;
          setCameraPosition(position);
          setCameraLocationStatus("ready");
        }
        return position;
      })
      .catch((error: unknown) => {
        if (cameraSessionRef.current === session) {
          const message = error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to determine your location.";
          setCameraLocationStatus("error");
          setCameraLocationError(message);
        }
        return null;
      });

    locationPromiseRef.current = request;
    return request;
  }, [captureLocation]);

  const processing = sidecarProcessing || items.some((item) => item.status === "extracting");

  useEffect(() => {
    onEvidenceReadyRef.current = onEvidenceReady;
  }, [onEvidenceReady]);

  useEffect(() => {
    onProcessingChangeRef.current = onProcessingChange;
  }, [onProcessingChange]);

  useEffect(() => {
    onEvidenceReadyRef.current(items
      .filter((item) => item.status === "ready")
      .map(({ file, type, lat, lon, accuracy, track }) => ({ file, type, lat, lon, accuracy, track })));
  }, [items]);

  useEffect(() => {
    onProcessingChangeRef.current?.(processing);
  }, [processing]);

  useEffect(() => {
    const video = videoPreviewRef.current;
    const stream = streamRef.current;
    if (!video || !stream || !cameraMode) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [cameraMode, cameraStarting]);

  const stopLocationWatch = useCallback(() => {
    if (locationWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
    }
    locationWatchIdRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    recordingActiveRef.current = false;
    captureBusyRef.current = false;
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    stopLocationWatch();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    locationPromiseRef.current = null;
    cameraPositionRef.current = null;
    setCameraPosition(null);
    recordingLocationPromiseRef.current = null;
    recordingStartedAtRef.current = 0;
    recordingTrackRef.current = [];
    setIsRecording(false);
    setCameraLocationStatus("idle");
    setCameraLocationError(null);
    setCaptureBusy(false);
    setRecordingSeconds(0);
    setRecordingPointCount(0);
    setCameraStarting(false);
    setCameraMode(null);
  }, [stopLocationWatch]);

  useEffect(() => () => {
    cameraSessionRef.current += 1;
    recordingActiveRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (locationWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
    }
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  const addReadyFile = useCallback((
    file: File,
    type: "image" | "video",
    source: "upload" | "camera",
    position: GeoPosition | null,
    track?: GeoTrackPoint[],
  ) => {
    const preview = URL.createObjectURL(file);
    previewUrlsRef.current.add(preview);
    setItems((current) => {
      if (current.length >= maxFiles) {
        URL.revokeObjectURL(preview);
        previewUrlsRef.current.delete(preview);
        return current;
      }
      return [...current, {
        id: uniqueId(),
        file,
        type,
        source,
        preview,
        status: "ready",
        lat: position?.lat ?? track?.[0]?.lat ?? null,
        lon: position?.lon ?? track?.[0]?.lon ?? null,
        accuracy: position?.accuracy ?? track?.[0]?.accuracy,
        track,
        locationSource: position || (track && track.length > 0)
          ? source === "camera" ? "browser" : "embedded"
          : undefined,
        warning: position || (track && track.length > 0)
          ? undefined
          : source === "camera"
            ? "Not geotagged — this camera capture will not have an Evidence Map pin."
            : "No embedded GPS was found.",
      }];
    });
  }, [maxFiles]);

  const processFiles = useCallback(async (selectedFiles: File[]) => {
    const sidecarFiles = selectedFiles.filter(isGpsInfoSidecar);
    const mediaCandidates = selectedFiles.filter((file) => !isGpsInfoSidecar(file));
    const availableSlots = Math.max(maxFiles - items.length, 0);
    const mediaFiles = mediaCandidates.slice(0, availableSlots);
    if (mediaFiles.length < mediaCandidates.length) {
      toast.error(`You can attach up to ${maxFiles} evidence files.`);
    }

    if (sidecarFiles.length > 0) setSidecarProcessing(true);
    try {
      let parsedSidecars: ParsedSidecar[] = [];
      if (sidecarFiles.length > 0) {
        const parserPromise = import("@/lib/geo-sidecar-parser");
        parsedSidecars = await Promise.all(sidecarFiles.map(async (file) => {
          try {
            const { extractGPSFromInfoFile } = await parserPromise;
            return {
              key: geoEvidencePairingKey(file.name),
              fileName: file.name,
              result: await extractGPSFromInfoFile(file),
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : "The GPS route could not be read.";
            toast.error(`Could not read “${file.name}”: ${message}`);
            return {
              key: geoEvidencePairingKey(file.name),
              fileName: file.name,
              error: message,
            };
          }
        }));
      }

      const duplicateSidecarKeys = new Set<string>();
      const sidecarsByKey = new Map<string, ParsedSidecar>();
      parsedSidecars.forEach((sidecar) => {
        if (duplicateSidecarKeys.has(sidecar.key)) return;
        if (sidecarsByKey.has(sidecar.key)) {
          duplicateSidecarKeys.add(sidecar.key);
          sidecarsByKey.delete(sidecar.key);
          toast.error(`More than one DA GPS .info file matches “${sidecar.fileName}”. Keep only one route file.`);
          return;
        }
        sidecarsByKey.set(sidecar.key, sidecar);
      });

      const pending: Array<{
        id: string;
        file: File;
        type: "image" | "video";
        placeholder: InternalEvidenceItem;
      }> = [];

      mediaFiles.forEach((file) => {
        const type = uploadKindFromType(file.type);
        if (!type || !isAllowedClientUploadType(file.type)) {
          toast.error(`“${file.name}” is not a supported photo or video.`);
          return;
        }

        const sizeLimit = type === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > sizeLimit) {
          toast.error(`“${file.name}” exceeds the ${type === "video" ? "100 MB" : "5 MB"} limit.`);
          return;
        }

        const id = uniqueId();
        const preview = URL.createObjectURL(file);
        previewUrlsRef.current.add(preview);
        pending.push({
          id,
          file,
          type,
          placeholder: {
            id,
            file,
            type,
            source: "upload",
            preview,
            status: "extracting",
            lat: null,
            lon: null,
          },
        });
      });

      const matchingVideoCounts = new Map<string, number>();
      const matchingVideos = [
        ...items
          .filter((item) => item.type === "video" && isDaGeoCameraVideo(item.file))
          .map((item) => item.file),
        ...pending
          .filter((entry) => entry.type === "video" && isDaGeoCameraVideo(entry.file))
          .map((entry) => entry.file),
      ];
      matchingVideos.forEach((file) => {
        const key = geoEvidencePairingKey(file.name);
        matchingVideoCounts.set(key, (matchingVideoCounts.get(key) ?? 0) + 1);
      });
      sidecarsByKey.forEach((sidecar, key) => {
        const matchCount = matchingVideoCounts.get(key) ?? 0;
        if (matchCount === 0) {
          sidecarsByKey.delete(key);
          toast.error(`No matching video was found for “${sidecar.fileName}”. Select the MP4 and its DA GPS .info file.`);
        } else if (matchCount > 1) {
          sidecarsByKey.delete(key);
          toast.error(`“${sidecar.fileName}” matches more than one MP4. Keep only one matching video.`);
        }
      });

      if (sidecarsByKey.size > 0 || pending.length > 0) {
        setItems((current) => {
          const updated = current.map((item) => {
            if (item.type !== "video" || !isDaGeoCameraVideo(item.file)) return item;
            const sidecar = sidecarsByKey.get(geoEvidencePairingKey(item.file.name));
            return sidecar ? attachDaSidecar(item, sidecar) : item;
          });
          return [...updated, ...pending.map((entry) => entry.placeholder)];
        });
      }

      await Promise.all(pending.map(async ({ id, file, type }) => {
        const sidecar = type === "video" && isDaGeoCameraVideo(file)
          ? sidecarsByKey.get(geoEvidencePairingKey(file.name))
          : undefined;
        if (sidecar?.result?.hasGeoData) {
          setItems((current) => current.map((item) => (
            item.id === id ? attachDaSidecar(item, sidecar) : item
          )));
          return;
        }

        try {
          if (type === "image") {
            const { extractGPSFromPhoto } = await import("@/lib/geo-photo-parser");
            const result = await extractGPSFromPhoto(file);
            setItems((current) => current.map((item) => item.id === id ? {
              ...item,
              status: "ready",
              lat: result.lat,
              lon: result.lon,
              locationSource: result.hasGeoData ? "embedded" : undefined,
              warning: result.hasGeoData ? undefined : "No embedded GPS was found.",
            } : item));
          } else {
            const { extractGPSFromVideoFile } = await import("@/lib/geo-video-parser");
            const result = await extractGPSFromVideoFile(file);
            const first = result.track[0];
            setItems((current) => current.map((item) => {
              if (item.id !== id || item.locationSource === "da-sidecar") return item;
              return {
                ...item,
                status: "ready",
                lat: first?.lat ?? null,
                lon: first?.lon ?? null,
                accuracy: first?.accuracy,
                track: result.track.length > 0 ? result.track : undefined,
                locationSource: result.hasGeoData ? "embedded" : undefined,
                warning: result.hasGeoData
                  ? undefined
                  : sidecar?.error
                    ? `DA GPS route could not be read: ${sidecar.error}`
                    : "No GPS route was found. For a DA GeoCamera video, add its matching GPS .info file.",
              };
            }));
          }
        } catch (error) {
          setItems((current) => current.map((item) => {
            if (item.id !== id || item.locationSource === "da-sidecar") return item;
            return {
              ...item,
              status: "ready",
              warning: error instanceof Error ? error.message : "GPS metadata could not be read.",
            };
          }));
        }
      }));
    } finally {
      if (sidecarFiles.length > 0) setSidecarProcessing(false);
    }
  }, [items, maxFiles]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) await processFiles(files);
  };

  const removeItem = (id: string) => {
    setItems((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
        previewUrlsRef.current.delete(removed.preview);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const locateItem = async (id: string) => {
    try {
      setLocatingItemId(id);
      const position = await captureLocation();
      setItems((current) => current.map((item) => item.id === id ? {
        ...item,
        lat: position.lat,
        lon: position.lon,
        accuracy: position.accuracy,
        track: item.type === "video" && (!item.track || item.track.length === 0)
          ? positionToTrack(position)
          : item.track,
        locationSource: "browser",
        warning: undefined,
      } : item));
      toast.success("Current location attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not capture your location.");
    } finally {
      setLocatingItemId(null);
    }
  };

  const openCamera = async (mode: CameraMode) => {
    if (items.length >= maxFiles) {
      toast.error(`You can attach up to ${maxFiles} evidence files.`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera access is not supported in this browser.");
      return;
    }

    const session = cameraSessionRef.current + 1;
    cameraSessionRef.current = session;
    setCameraMode(mode);
    setCameraStarting(true);
    void requestCameraLocation(session);
    try {
      const video = { facingMode: { ideal: "environment" } };
      let stream: MediaStream;
      let withoutAudio = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio: mode === "video",
        });
      } catch (initialError) {
        if (cameraSessionRef.current !== session) throw initialError;
        if (mode !== "video") throw initialError;
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        withoutAudio = true;
      }
      if (cameraSessionRef.current !== session) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraStarting(false);
      if (withoutAudio) {
        toast.info("Microphone unavailable", {
          description: "The GeoVideo will be recorded without audio.",
        });
      }
    } catch (error) {
      if (cameraSessionRef.current !== session) return;
      stopCamera();
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Camera permission was denied."
        : "The camera could not be started.";
      toast.error(message);
    }
  };

  const capturePhoto = async (withoutLocation = false) => {
    if (captureBusyRef.current) return;
    if (!withoutLocation && !cameraPositionRef.current) {
      toast.error("A location fix is required for a geotagged photo.", {
        description: cameraLocationError || "Wait for GPS or choose Retry location.",
      });
      return;
    }
    const video = videoPreviewRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("The camera is not ready yet.");
      return;
    }

    const session = cameraSessionRef.current;
    captureBusyRef.current = true;
    setCaptureBusy(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      captureBusyRef.current = false;
      setCaptureBusy(false);
      toast.error("Photo capture is unavailable in this browser.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.92, 0.82, 0.72, 0.62]) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_IMAGE_BYTES) break;
    }
    if (cameraSessionRef.current !== session) return;
    if (!blob) {
      captureBusyRef.current = false;
      setCaptureBusy(false);
      toast.error("The photo could not be captured.");
      return;
    }
    if (blob.size > MAX_IMAGE_BYTES) {
      captureBusyRef.current = false;
      setCaptureBusy(false);
      toast.error("The captured photo exceeds the 5 MB limit. Try a lower camera resolution.");
      return;
    }
    if (cameraSessionRef.current !== session) return;
    const position = withoutLocation ? null : cameraPositionRef.current;
    addReadyFile(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }), "image", "camera", position);
    stopCamera();
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (captureBusyRef.current || (recorderRef.current && recorderRef.current.state !== "inactive")) return;
    const initialPosition = cameraPositionRef.current;
    if (!initialPosition) {
      toast.error("A location fix is required before starting a GeoVideo.", {
        description: cameraLocationError || "Wait for GPS or choose Retry location.",
      });
      return;
    }
    if (!stream || typeof MediaRecorder === "undefined") {
      toast.error("Video recording is not supported in this browser.");
      return;
    }

    const session = cameraSessionRef.current;
    const mimeType = recordingMimeType();
    try {
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (cameraSessionRef.current !== session) return;
        toast.error("The video recorder stopped because of a camera or encoder error.");
        stopCamera();
      };
      recorderRef.current = recorder;
      const startedAt = performance.now();
      recordingStartedAtRef.current = startedAt;
      const initialPoint: GeoTrackPoint = {
        lat: initialPosition.lat,
        lon: initialPosition.lon,
        accuracy: initialPosition.accuracy,
        timeSeconds: 0,
      };
      recordingTrackRef.current = [initialPoint];
      recordingActiveRef.current = true;
      recordingLocationPromiseRef.current = Promise.resolve(initialPoint);
      recorder.start(1000);
      setRecordingPointCount(1);
      if (navigator.geolocation) {
        locationWatchIdRef.current = navigator.geolocation.watchPosition(
          (browserPosition) => {
            if (
              cameraSessionRef.current !== session
              || !recordingActiveRef.current
              || recordingTrackRef.current.length >= 10_000
            ) return;
            recordingTrackRef.current.push({
              lat: browserPosition.coords.latitude,
              lon: browserPosition.coords.longitude,
              accuracy: browserPosition.coords.accuracy,
              timeSeconds: Math.max(0, (performance.now() - recordingStartedAtRef.current) / 1000),
            });
            setRecordingPointCount(recordingTrackRef.current.length);
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
        );
      }
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch {
      stopCamera();
      toast.error("This browser could not start a compatible video recording.");
    }
  };

  const stopRecording = async () => {
    if (captureBusyRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const session = cameraSessionRef.current;
    captureBusyRef.current = true;
    setCaptureBusy(true);
    recordingActiveRef.current = false;
    stopLocationWatch();
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const stoppedAtSeconds = Math.max(0, (performance.now() - recordingStartedAtRef.current) / 1000);
    const finished = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.addEventListener("error", () => resolve(), { once: true });
    });
    try {
      recorder.stop();
      await finished;
    } catch {
      if (cameraSessionRef.current === session) {
        toast.error("The video recording could not be finalized.");
        stopCamera();
      }
      return;
    }
    if (cameraSessionRef.current !== session) return;

    const mimeType = recorder.mimeType || "video/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    if (blob.size > MAX_VIDEO_BYTES) {
      toast.error("The recorded video exceeds the 100 MB limit. Please record a shorter clip.");
      stopCamera();
      return;
    }
    if (blob.size > 0) {
      const file = new File([blob], `camera-${Date.now()}.${fileExtension(mimeType)}`, { type: mimeType.split(";")[0] });
      let track = recordingTrackRef.current.slice(0, 10_000);
      if (track.length === 0 && recordingLocationPromiseRef.current) {
        const fallbackPoint = await resolveWithin(recordingLocationPromiseRef.current, 1_500);
        if (cameraSessionRef.current !== session) return;
        if (fallbackPoint) {
          track = [{
            ...fallbackPoint,
            timeSeconds: Math.min(fallbackPoint.timeSeconds ?? 0, stoppedAtSeconds),
          }];
        }
      }
      addReadyFile(file, "video", "camera", null, track.length > 0 ? track : undefined);
    } else {
      toast.error("The camera did not produce a playable video. Please try recording again.");
    }
    stopCamera();
  };

  const moveEvidencePoint = useCallback((
    id: string,
    position: { lat: number; lon: number },
  ) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;

      const latDelta = position.lat - (item.lat ?? position.lat);
      const lonDelta = position.lon - (item.lon ?? position.lon);
      const adjustedTrack = item.track?.map((point) => ({
        ...point,
        lat: point.lat + latDelta,
        lon: point.lon + lonDelta,
        accuracy: undefined,
      }));

      return {
        ...item,
        lat: position.lat,
        lon: position.lon,
        accuracy: undefined,
        track: adjustedTrack,
        locationSource: "manual",
        warning: undefined,
      };
    }));
  }, []);

  const mapData = useMemo(() => {
    const points: EvidenceMapPoint[] = [];
    const tracks: EvidenceMapTrack[] = [];
    items.forEach((item, index) => {
      if (typeof item.lat === "number" && typeof item.lon === "number") {
        points.push({
          id: item.id,
          label: item.file.name || `Evidence ${index + 1}`,
          type: item.type,
          lat: item.lat,
          lon: item.lon,
          accuracy: item.accuracy,
        });
      }
      if (item.track && item.track.length > 1) {
        tracks.push({ id: `${item.id}-track`, label: item.file.name, points: item.track });
      }
    });
    return { points, tracks };
  }, [items]);

  const hasLocations = mapData.points.length > 0 || mapData.tracks.length > 0;
  const hasDaSidecar = items.some((item) => item.locationSource === "da-sidecar");
  const editablePointIds = useMemo(
    () => mapData.points.map((point) => point.id),
    [mapData.points],
  );
  const canAddMore = items.length < maxFiles && !disabled;
  const canChooseFiles = !disabled && !processing;
  const cameraLocationReady = cameraLocationStatus === "ready" && cameraPosition !== null;
  const cameraLocationApproximate = cameraLocationReady && cameraPosition.accuracy > 100;
  const cameraLocationDenied = cameraLocationError?.toLowerCase().includes("permission") ?? false;
  const requestCameraClose = () => {
    if (isRecording && !window.confirm("Discard the current GeoVideo recording?")) return;
    stopCamera();
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70">
        <div className={cn("grid", compact ? "grid-cols-3" : "sm:grid-cols-3")}>
          <label
            htmlFor={inputId}
            className={cn(
              "group flex flex-col items-center justify-center gap-2 border-slate-200 text-center transition dark:border-slate-800",
              compact ? "min-h-24 border-r p-3" : "min-h-32 border-b p-5 sm:border-r sm:border-b-0",
              canChooseFiles ? "cursor-pointer hover:bg-emerald-500/5" : "cursor-not-allowed opacity-50",
            )}
          >
            <span className={cn("grid place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:-translate-y-0.5 dark:text-emerald-400", compact ? "size-9" : "size-11")}>
              <FileUp className="size-5" />
            </span>
            <span className={cn("font-extrabold text-slate-900 dark:text-white", compact ? "text-xs" : "text-sm")}>Upload files</span>
            <span className={cn("text-[11px] leading-4 text-slate-500", compact && "hidden sm:block")}>Photos, videos, or a DA MP4 + GPS .info pair</span>
            <input
              id={inputId}
              type="file"
              multiple
              accept={GEO_EVIDENCE_ACCEPT}
              className="sr-only"
              disabled={!canChooseFiles}
              onChange={handleFileChange}
            />
          </label>

          <button
            type="button"
            disabled={!canAddMore}
            onClick={() => void openCamera("photo")}
            className={cn(
              "group flex flex-col items-center justify-center gap-2 border-slate-200 text-center transition hover:bg-sky-500/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800",
              compact ? "min-h-24 border-r p-3" : "min-h-32 border-b p-5 sm:border-r sm:border-b-0",
            )}
          >
            <span className={cn("grid place-items-center rounded-xl bg-sky-500/10 text-sky-600 transition-transform group-hover:-translate-y-0.5 dark:text-sky-400", compact ? "size-9" : "size-11")}>
              <Camera className="size-5" />
            </span>
            <span className={cn("font-extrabold text-slate-900 dark:text-white", compact ? "text-xs" : "text-sm")}>Take photo</span>
            <span className={cn("text-[11px] leading-4 text-slate-500", compact && "hidden sm:block")}>Camera + current GPS position</span>
          </button>

          <button
            type="button"
            disabled={!canAddMore}
            onClick={() => void openCamera("video")}
            className={cn(
              "group flex flex-col items-center justify-center gap-2 text-center transition hover:bg-amber-500/5 disabled:cursor-not-allowed disabled:opacity-50",
              compact ? "min-h-24 p-3" : "min-h-32 p-5",
            )}
          >
            <span className={cn("grid place-items-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform group-hover:-translate-y-0.5 dark:text-amber-400", compact ? "size-9" : "size-11")}>
              <Video className="size-5" />
            </span>
            <span className={cn("font-extrabold text-slate-900 dark:text-white", compact ? "text-xs" : "text-sm")}>Record video</span>
            <span className={cn("text-[11px] leading-4 text-slate-500", compact && "hidden sm:block")}>Timed GPS route while recording</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Crosshair className="size-3.5 text-emerald-500" />
            {sidecarProcessing
              ? <><Loader2 className="size-3.5 animate-spin" /> Reading DA GeoCamera route&hellip;</>
              : <>DA GPS .info files stay on your device; the extracted route is submitted with the video.</>}
          </span>
          {!compact ? <span className="font-bold tabular-nums">{items.length}/{maxFiles} files</span> : null}
        </div>
      </div>

      {items.length > 0 ? (
        <div className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="relative aspect-video overflow-hidden bg-slate-950">
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt={item.file.name} className="h-full w-full object-cover" />
                ) : (
                  <video src={item.preview} controls preload="metadata" className="h-full w-full object-cover" />
                )}
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white backdrop-blur">
                  {item.locationSource === "da-sidecar"
                    ? <MapPin className="size-3" />
                    : item.source === "camera" ? <Camera className="size-3" /> : <Images className="size-3" />}
                  {item.locationSource === "da-sidecar" ? "DA GPS" : item.source}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={disabled}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-slate-950/80 text-white backdrop-blur transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${item.file.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="space-y-2.5 p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-900 dark:text-white">{item.file.name}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">{item.type}</span>
                </div>
                {item.status === "extracting" ? (
                  <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 px-2.5 py-2 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                    <Loader2 className="size-3.5 animate-spin" /> Reading location metadata&hellip;
                  </div>
                ) : typeof item.lat === "number" && typeof item.lon === "number" ? (
                  <div className={cn(
                    "flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold",
                    typeof item.accuracy === "number" && item.accuracy > 100
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                      : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                  )}>
                    {typeof item.accuracy === "number" && item.accuracy > 100
                      ? <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      : <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />}
                    <span>
                      {item.locationSource === "da-sidecar"
                        ? "DA GeoCamera route"
                        : typeof item.accuracy === "number" && item.accuracy > 100 ? "Approximate location" : "GPS attached"}
                      {" "}&middot; {item.lat.toFixed(6)}, {item.lon.toFixed(6)}
                      {typeof item.accuracy === "number" ? ` · ±${Math.round(item.accuracy)} m` : ""}
                      {item.track && item.track.length > 1 ? ` · ${item.track.length} route points` : ""}
                      {typeof item.accuracy === "number" && item.accuracy > 100 ? (
                        <span className="mt-1 block">Drag the pin below to correct it.</span>
                      ) : null}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span>{item.warning || "No GPS coordinates are attached."}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full text-xs"
                      disabled={disabled || locatingItemId === item.id}
                      onClick={() => void locateItem(item.id)}
                    >
                      {locatingItemId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
                      Use current location
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {hasLocations ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><MapPin className="size-4 text-emerald-500" /> Location preview</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Drag a pin to correct an approximate device location.</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300">{hasDaSidecar ? "DA + device GPS" : "Device metadata"}</span>
          </div>
          <LeafletEvidenceMap
            points={mapData.points}
            tracks={mapData.tracks}
            editablePointIds={editablePointIds}
            onPointMove={moveEvidencePoint}
            showAccuracy
            className={cn("w-full", compact ? "h-48" : "h-64")}
          />
        </div>
      ) : null}

      {cameraMode ? (
        <Dialog open onOpenChange={(open) => { if (!open) requestCameraClose(); }}>
          <DialogContent
            showCloseButton={false}
            className="!inset-0 !top-0 !left-0 z-[110] grid !h-dvh !w-screen !max-w-none !translate-x-0 !translate-y-0 place-items-center overflow-y-auto !rounded-none bg-slate-950/95 !p-4 text-white ring-0 backdrop-blur-sm sm:!max-w-none"
          >
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-sm font-extrabold text-white">
                    {cameraMode === "photo" ? <Camera className="size-4 text-sky-300" aria-hidden="true" /> : <Video className="size-4 text-amber-300" aria-hidden="true" />}
                    {cameraMode === "photo" ? "Geotagged photo capture" : "GeoVideo recorder"}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-[11px] text-slate-400">
                    {cameraMode === "photo"
                      ? "The photo uses the verified device location shown below."
                      : "The route starts from the verified location shown below."}
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  onClick={requestCameraClose}
                  className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Close camera"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="relative aspect-video bg-black">
                <video ref={videoPreviewRef} muted playsInline className="h-full w-full object-contain" />
                {cameraStarting ? (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950 text-white" aria-live="polite">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-3 size-7 animate-spin text-emerald-400" />
                      <p className="text-sm font-bold">Waiting for camera permission&hellip;</p>
                    </div>
                  </div>
                ) : null}
                {isRecording ? (
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg">
                      <Radio className="size-3.5 animate-pulse" aria-hidden="true" /> REC {recordingSeconds}s
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3 py-1.5 text-[11px] font-bold text-emerald-300 shadow-lg backdrop-blur">
                      <Crosshair className="size-3.5" aria-hidden="true" /> {recordingPointCount} GPS point{recordingPointCount === 1 ? "" : "s"}
                    </span>
                  </div>
                ) : null}
              </div>
              <div
                id={cameraGpsStatusId}
                role={cameraLocationStatus === "error" ? "alert" : "status"}
                aria-live="polite"
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs",
                  cameraLocationStatus === "error" && "bg-red-500/10 text-red-100",
                  cameraLocationStatus === "locating" && "bg-sky-500/10 text-sky-100",
                  cameraLocationReady && !cameraLocationApproximate && "bg-emerald-500/10 text-emerald-100",
                  cameraLocationApproximate && "bg-amber-500/10 text-amber-100",
                )}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {cameraLocationStatus === "locating" ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
                  {cameraLocationReady && !cameraLocationApproximate ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                  {cameraLocationApproximate || cameraLocationStatus === "error" ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                  <div>
                    {cameraLocationStatus === "locating" ? (
                      <>
                        <p className="font-extrabold">Finding a precise location&hellip;</p>
                        <p className="mt-0.5 text-white/70">This can take up to 15 seconds.</p>
                      </>
                    ) : cameraLocationReady ? (
                      <>
                        <p className="font-extrabold">
                          {cameraLocationApproximate ? "Approximate location" : "Location ready"}
                          {" "}&middot; &plusmn;{Math.round(cameraPosition.accuracy)} m
                        </p>
                        <p className="mt-0.5 text-white/70">
                          {cameraLocationApproximate
                            ? "You can drag the pin to its correct position after capture."
                            : "The coordinates will be attached to this evidence."}
                        </p>
                      </>
                    ) : cameraLocationStatus === "error" ? (
                      <>
                        <p className="font-extrabold">{cameraLocationError || "Location could not be determined."}</p>
                        <p className="mt-0.5 text-white/70">
                          {cameraLocationDenied
                            ? "Allow Location in browser Site settings, reload the page, then retry."
                            : "Check Windows or device Location Services, then retry."}
                        </p>
                      </>
                    ) : (
                      <p className="font-extrabold">Location has not been requested.</p>
                    )}
                  </div>
                </div>
                {cameraLocationStatus === "error" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void requestCameraLocation(cameraSessionRef.current)}
                    className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <LocateFixed className="size-3.5" aria-hidden="true" /> Retry location
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 p-4">
                {cameraMode === "photo" ? (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      disabled={cameraStarting || captureBusy || !cameraLocationReady}
                      aria-describedby={cameraGpsStatusId}
                      onClick={() => void capturePhoto()}
                      className="min-h-11 rounded-full bg-sky-500 px-7 text-white hover:bg-sky-400"
                    >
                      {captureBusy || cameraLocationStatus === "locating"
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Camera className="size-4" />}
                      {captureBusy
                        ? "Saving photo…"
                        : cameraLocationStatus === "locating"
                          ? "Finding GPS…"
                          : cameraLocationStatus === "error"
                            ? "Location required"
                            : "Take geotagged photo"}
                    </Button>
                    {cameraLocationStatus === "error" ? (
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        disabled={cameraStarting || captureBusy}
                        onClick={() => void capturePhoto(true)}
                        className="min-h-11 rounded-full border-white/25 bg-white/5 px-6 text-white hover:bg-white/15 hover:text-white"
                      >
                        <Camera className="size-4" aria-hidden="true" /> Take without location
                      </Button>
                    ) : null}
                  </>
                ) : isRecording ? (
                  <Button type="button" size="lg" disabled={captureBusy} onClick={() => void stopRecording()} className="min-h-11 rounded-full bg-red-500 px-7 text-white hover:bg-red-400">
                    {captureBusy ? <Loader2 className="size-4 animate-spin" /> : <CircleStop className="size-4" />}
                    {captureBusy ? "Finalizing…" : "Stop recording"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    disabled={cameraStarting || captureBusy || !cameraLocationReady}
                    aria-describedby={cameraGpsStatusId}
                    onClick={startRecording}
                    className="min-h-11 rounded-full bg-amber-500 px-7 text-slate-950 hover:bg-amber-400"
                  >
                    {cameraLocationStatus === "locating"
                      ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      : <Radio className="size-4" aria-hidden="true" />}
                    {cameraLocationStatus === "locating" ? "Finding GPS…" : "Start GeoVideo recording"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
