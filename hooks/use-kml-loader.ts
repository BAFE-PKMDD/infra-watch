"use client";

import { useState, useEffect } from 'react';
import { kml } from "@tmcw/togeojson";

interface UseKmlLoaderProps {
  projectId?: string;
}

export function useKmlLoader({ projectId }: UseKmlLoaderProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setGeoJsonData(null);
      return;
    }

    const loadKml = async () => {
      setLoading(true);
      setError(null);
      try {
        // Now using Project ID for security instead of a raw URL
        const proxyUrl = `/api/kml-proxy?projectId=${projectId}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch KML: ${response.statusText}`);
        }

        const str = await response.text();
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(str, "text/xml");

        // Convert KML to GeoJSON
        const converted = kml(kmlDom);

        // Sanitize: Only keep LineString and MultiLineString features
        if (converted && converted.type === 'FeatureCollection') {
          converted.features = converted.features.filter((feature: any) =>
            feature.geometry?.type === 'LineString' ||
            feature.geometry?.type === 'MultiLineString'
          );
        }

        setGeoJsonData(converted);
      } catch (err) {
        // Silently handle "not found" cases if they aren't critical
        if (err instanceof Error && err.message.includes('not found')) {
          setGeoJsonData(null);
        } else {
          console.error("Error loading KML:", err);
          setError(err instanceof Error ? err.message : "Error loading KML");
        }
      } finally {
        setLoading(false);
      }
    };

    loadKml();
  }, [projectId]);

  return { geoJsonData, loading, error };
}
