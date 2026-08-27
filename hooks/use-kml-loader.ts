"use client";

import { useEffect, useState } from "react";
import { kml } from "@tmcw/togeojson";

type KmlGeoJson = ReturnType<typeof kml>;

interface UseKmlLoaderProps {
  projectId?: string;
}

export function useKmlLoader({ projectId }: UseKmlLoaderProps) {
  const [geoJsonData, setGeoJsonData] = useState<KmlGeoJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    const loadKml = async () => {
      setLoading(true);
      setError(null);
      try {
        // Now using Project ID for security instead of a raw URL
        const proxyUrl = `/api/kml-proxy?projectId=${projectId}`;
        const response = await fetch(proxyUrl);

        if (response.status === 404) {
          if (!cancelled) {
            setGeoJsonData(null);
          }
          return;
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errorData.error || `Failed to fetch KML: ${response.statusText}`);
        }

        const str = await response.text();
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(str, "text/xml");

        // Convert KML to GeoJSON
        const converted = kml(kmlDom);

        // Sanitize: Only keep LineString and MultiLineString features
        if (converted.type === "FeatureCollection") {
          converted.features = converted.features.filter(
            (feature) =>
              feature.geometry?.type === "LineString" ||
              feature.geometry?.type === "MultiLineString",
          );
        }

        if (!cancelled) {
          setGeoJsonData(converted);
        }
      } catch (caughtError) {
        if (cancelled) return;

        // Silently handle "not found" cases if they aren't critical
        if (caughtError instanceof Error && caughtError.message.includes("not found")) {
          setGeoJsonData(null);
        } else {
          console.error("Error loading KML:", caughtError);
          setError(caughtError instanceof Error ? caughtError.message : "Error loading KML");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadKml();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return {
    geoJsonData: projectId ? geoJsonData : null,
    loading: projectId ? loading : false,
    error: projectId ? error : null,
  };
}
