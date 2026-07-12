"use client";

import { useState, useEffect, useRef } from 'react';
import { GeoTag, ExtractedGeoTag } from '@/types/photo.types';

interface UseExtractExifProps {
  geotags: GeoTag[];
  projectId?: string;
  onExtractionComplete?: () => void;
}

export function useExtractExif({ geotags, projectId, onExtractionComplete }: UseExtractExifProps) {
  const [extractedGeotags, setExtractedGeotags] = useState<ExtractedGeoTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const hasExtractedRef = useRef(false);

  useEffect(() => {
    if (!geotags || geotags.length === 0) {
      setExtractedGeotags([]);
      hasExtractedRef.current = false;
      return;
    }

    // Only extract once
    if (hasExtractedRef.current) {
      return;
    }

    hasExtractedRef.current = true;
    extractCoordinates();
  }, [geotags, projectId]);

  const extractCoordinates = async () => {
    setLoading(true);
    setProgress({ current: 0, total: geotags.length });

    const results: ExtractedGeoTag[] = [];

    // Separate tags that already have coordinates from those that need extraction
    const tagsWithCoordinates = geotags.filter(tag => tag.latitude && tag.longitude);
    const tagsNeedingExtraction = geotags.filter(tag => !tag.latitude && !tag.longitude && tag.url);

    // Add tags that already have coordinates
    results.push(...tagsWithCoordinates as ExtractedGeoTag[]);

    // If there are no tags needing extraction, we're done
    if (tagsNeedingExtraction.length === 0) {
      setExtractedGeotags(results);
      setLoading(false);
      return;
    }

    // If we have a projectId, use the new API approach
    if (projectId) {
      try {
        const response = await fetch('/api/extract-gps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId }),
        });

        const data = await response.json();

        if (data.success && Array.isArray(data.results)) {
          // Map results back to original tags
          data.results.forEach((result: any) => {
            if (result.success && result.latitude && result.longitude) {
              // Find the original tag by id
              const originalTag = tagsNeedingExtraction.find(
                tag => tag.id === result.id
              );

              if (originalTag) {
                const extracted: ExtractedGeoTag = {
                  ...originalTag,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  timestamp: result.timestamp || originalTag.timestamp,
                  exifExtracted: true
                };
                results.push(extracted);
              }
            }
          });

          // Trigger callback to refetch project data
          if (onExtractionComplete) {
            onExtractionComplete();
          }
        }
      } catch (error) {
        console.error('GPS extraction error:', error);
      }
    }

    setProgress({ current: geotags.length, total: geotags.length });
    setExtractedGeotags(results);
    setLoading(false);
  };

  return {
    geotags: extractedGeotags,
    loading,
    progress,
    hasCoordinates: extractedGeotags.length > 0
  };
}
