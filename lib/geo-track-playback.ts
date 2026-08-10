import type { GeoTrackPoint } from "@/types/geo-evidence.types";

/**
 * Resolve the geographic position that corresponds to the video's playhead.
 *
 * Tracks with timestamps are aligned across their recorded time range. Tracks
 * without complete timing metadata fall back to evenly spaced samples.
 */
export function interpolateGeoTrackPoint(
  track: readonly GeoTrackPoint[],
  currentTime: number,
  duration: number,
): GeoTrackPoint | null {
  if (track.length === 0) return null;
  if (track.length === 1 || !Number.isFinite(duration) || duration <= 0) return track[0];

  const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(currentTime, 0) : 0;
  const hasTimes = track.every(
    (point) => typeof point.timeSeconds === "number" && Number.isFinite(point.timeSeconds),
  );
  let lowerIndex = 0;
  let fraction = 0;

  if (hasTimes) {
    const firstTime = track[0].timeSeconds as number;
    const lastTime = track[track.length - 1].timeSeconds as number;
    if (lastTime <= firstTime || safeCurrentTime <= firstTime) return track[0];
    if (safeCurrentTime >= lastTime) return track[track.length - 1];

    let low = 0;
    let high = track.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if ((track[middle].timeSeconds as number) <= safeCurrentTime) low = middle;
      else high = middle;
    }

    lowerIndex = low;
    const startTime = track[lowerIndex].timeSeconds as number;
    const endTime = track[lowerIndex + 1].timeSeconds as number;
    fraction = endTime > startTime ? (safeCurrentTime - startTime) / (endTime - startTime) : 0;
  } else {
    const scaledIndex = Math.min(safeCurrentTime / duration, 1) * (track.length - 1);
    lowerIndex = Math.min(Math.floor(scaledIndex), track.length - 2);
    fraction = scaledIndex - lowerIndex;
  }

  const start = track[lowerIndex];
  const end = track[Math.min(lowerIndex + 1, track.length - 1)];
  const accuracy = typeof start.accuracy === "number" && typeof end.accuracy === "number"
    ? start.accuracy + ((end.accuracy - start.accuracy) * fraction)
    : start.accuracy ?? end.accuracy;

  return {
    lat: start.lat + ((end.lat - start.lat) * fraction),
    lon: start.lon + ((end.lon - start.lon) * fraction),
    accuracy,
  };
}
