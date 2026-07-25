"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoPosition {
  lat: number;
  lon: number;
  accuracy: number;
}

export interface UseGeolocationResult {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  capture: () => Promise<GeoPosition>;
}

const DEFAULT_ENABLE_HIGH_ACCURACY = true;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAXIMUM_AGE_MS = 0;

function geolocationErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = Number((error as { code?: unknown }).code);
    if (code === 1) return "Location permission was denied.";
    if (code === 2) return "Location information is unavailable.";
    if (code === 3) return "Location request timed out.";
  }

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Location permission was denied.";
    }
    if (error.name === "TimeoutError") return "Location request timed out.";
    if (error.name === "NotFoundError" || error.name === "NotReadableError") {
      return "Location information is unavailable.";
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return "Unable to determine your location.";
}

/**
 * Captures a single browser geolocation sample. Concurrent calls maintain an
 * accurate loading state, while only the most recent call updates visible
 * position/error state.
 */
export function useGeolocation(options: PositionOptions = {}): UseGeolocationResult {
  const {
    enableHighAccuracy = DEFAULT_ENABLE_HIGH_ACCURACY,
    timeout = DEFAULT_TIMEOUT_MS,
    maximumAge = DEFAULT_MAXIMUM_AGE_MS,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const latestRequestRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const capture = useCallback(() => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    if (mountedRef.current) {
      setError(null);
      setPosition(null);
      setPendingCount((count) => count + 1);
    }

    return new Promise<GeoPosition>((resolve, reject) => {
      let settled = false;

      const finish = () => {
        if (settled) return false;
        settled = true;
        if (mountedRef.current) {
          setPendingCount((count) => Math.max(0, count - 1));
        }
        return true;
      };

      const fail = (reason: unknown) => {
        if (!finish()) return;
        const message = geolocationErrorMessage(reason);
        if (mountedRef.current && requestId === latestRequestRef.current) {
          setError(message);
        }
        reject(new Error(message));
      };

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        fail(new Error("Geolocation is not supported by this browser."));
        return;
      }

      try {
        navigator.geolocation.getCurrentPosition(
          (browserPosition) => {
            if (!finish()) return;
            const captured: GeoPosition = {
              lat: browserPosition.coords.latitude,
              lon: browserPosition.coords.longitude,
              accuracy: browserPosition.coords.accuracy,
            };

            if (mountedRef.current && requestId === latestRequestRef.current) {
              setPosition(captured);
              setError(null);
            }
            resolve(captured);
          },
          fail,
          { enableHighAccuracy, timeout, maximumAge },
        );
      } catch (captureError) {
        fail(captureError);
      }
    });
  }, [enableHighAccuracy, maximumAge, timeout]);

  return {
    position,
    error,
    loading: pendingCount > 0,
    capture,
  };
}
