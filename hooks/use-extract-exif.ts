"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtractedGeoTag, GeoTag } from "@/types/photo.types";

interface UseExtractExifProps {
  geotags: GeoTag[];
  projectId?: string;
  onExtractionComplete?: () => void;
}

interface ExtractionResult {
  id?: string;
  success: boolean;
  latitude?: string;
  longitude?: string;
  timestamp?: string;
}

interface ExtractionResponse {
  success: boolean;
  results?: ExtractionResult[];
}

export function useExtractExif({ geotags, projectId, onExtractionComplete }: UseExtractExifProps) {
  const [extractedGeotags, setExtractedGeotags] = useState<ExtractedGeoTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const hasExtractedRef = useRef(false);

  useEffect(() => {
    if (geotags.length === 0) {
      hasExtractedRef.current = false;
      return;
    }

    // Only extract once
    if (hasExtractedRef.current) {
      return;
    }

    hasExtractedRef.current = true;
    const extractCoordinates = async () => {
      setLoading(true);
      setProgress({ current: 0, total: geotags.length });

      const results: ExtractedGeoTag[] = [];

      // Separate tags that already have coordinates from those that need extraction
      const tagsWithCoordinates = geotags.filter(
        (tag): tag is ExtractedGeoTag => Boolean(tag.latitude && tag.longitude),
      );
      const tagsNeedingExtraction = geotags.filter(
        (tag) => !tag.latitude && !tag.longitude && tag.url,
      );

      // Add tags that already have coordinates
      results.push(...tagsWithCoordinates);

      // If there are no tags needing extraction, we're done
      if (tagsNeedingExtraction.length === 0) {
        setExtractedGeotags(results);
        setLoading(false);
        return;
      }

      // If we have a projectId, use the new API approach
      if (projectId) {
        try {
          const response = await fetch("/api/extract-gps", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ projectId }),
          });

          const contentType = response.headers.get("content-type") ?? "";
          if (!response.ok || !contentType.includes("application/json")) {
            throw new Error(`GPS extraction service unavailable (${response.status})`);
          }

          const data = (await response.json()) as ExtractionResponse;

          if (data.success && Array.isArray(data.results)) {
            // Map results back to original tags
            data.results.forEach((result) => {
              if (result.success && result.latitude && result.longitude) {
                // Find the original tag by id
                const originalTag = tagsNeedingExtraction.find(
                  (tag) => tag.id === result.id,
                );

                if (originalTag) {
                  results.push({
                    ...originalTag,
                    latitude: result.latitude,
                    longitude: result.longitude,
                    timestamp: result.timestamp || originalTag.timestamp,
                    exifExtracted: true,
                  });
                }
              }
            });

            // Trigger callback to refetch project data
            onExtractionComplete?.();
          }
        } catch (error) {
          console.warn("GPS extraction skipped:", error);
        }
      }

      setProgress({ current: geotags.length, total: geotags.length });
      setExtractedGeotags(results);
      setLoading(false);
    };

    void extractCoordinates();
  }, [geotags, projectId, onExtractionComplete]);

  const visibleGeotags = geotags.length === 0 ? [] : extractedGeotags;

  return {
    geotags: visibleGeotags,
    loading,
    progress,
    hasCoordinates: visibleGeotags.length > 0,
  };
}
