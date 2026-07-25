import type { GeoTrackPoint } from "@/types/geo-evidence.types";

export type { GeoTrackPoint } from "@/types/geo-evidence.types";

export interface GeoExtractionResult {
  track: GeoTrackPoint[];
  hasGeoData: boolean;
}

type Candidate = {
  point: GeoTrackPoint;
  sourceOffset: number;
  absoluteTimeMs?: number;
};

const CHUNK_BYTES = 1024 * 1024;
const OVERLAP_BYTES = 64 * 1024;
const MAX_TRACK_POINTS = 10_000;
const DUPLICATE_METADATA_DISTANCE = 2_048;

function emptyResult(): GeoExtractionResult {
  return { track: [], hasGeoData: false };
}

function finiteNumber(value: string | number | undefined) {
  if (value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function makeCandidate(
  latValue: string | number | undefined,
  lonValue: string | number | undefined,
  sourceOffset: number,
  extras: { accuracy?: string | number; timeSeconds?: string | number; absoluteTimeMs?: number } = {},
): Candidate | null {
  const parsedLat = finiteNumber(latValue);
  const parsedLon = finiteNumber(lonValue);
  if (parsedLat === null || parsedLon === null || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
    return null;
  }

  const lat = Object.is(parsedLat, -0) ? 0 : parsedLat;
  const lon = Object.is(parsedLon, -0) ? 0 : parsedLon;
  const accuracy = finiteNumber(extras.accuracy);
  const timeSeconds = finiteNumber(extras.timeSeconds);
  const point: GeoTrackPoint = { lat, lon };

  if (accuracy !== null && accuracy >= 0) point.accuracy = accuracy;
  if (timeSeconds !== null && timeSeconds >= 0) point.timeSeconds = timeSeconds;

  return {
    point,
    sourceOffset,
    absoluteTimeMs: Number.isFinite(extras.absoluteTimeMs) ? extras.absoluteTimeMs : undefined,
  };
}

function scanIso6709(text: string, baseOffset: number, candidates: Candidate[]) {
  const standardPattern = /([+-]\d{1,2}(?:\.\d{1,12})?)([+-]\d{1,3}(?:\.\d{1,12})?)(?:[+-]\d{1,7}(?:\.\d{1,4})?)?\/(?=[\0\s"'<>]|$)/g;
  for (const match of text.matchAll(standardPattern)) {
    const candidate = makeCandidate(match[1], match[2], baseOffset + (match.index ?? 0));
    if (candidate) candidates.push(candidate);
  }

  // QuickTime's copyright-x-y-z atom may omit ISO 6709's terminating slash.
  const quickTimePattern = /\u00a9xyz[\s\S]{0,160}?([+-]\d{1,2}(?:\.\d{1,12})?)([+-]\d{1,3}(?:\.\d{1,12})?)/gi;
  for (const match of text.matchAll(quickTimePattern)) {
    const candidate = makeCandidate(match[1], match[2], baseOffset + (match.index ?? 0));
    if (candidate) candidates.push(candidate);
  }
}

function scanLabelledCoordinates(text: string, baseOffset: number, candidates: Candidate[]) {
  const latThenLon = /\b(?:lat|latitude)\s*[:=]?\s*([+-]?\d{1,3}(?:\.\d{1,12})?)[^\d+\-]{0,48}\b(?:lon|lng|longitude)\s*[:=]?\s*([+-]?\d{1,3}(?:\.\d{1,12})?)/gi;
  for (const match of text.matchAll(latThenLon)) {
    const candidate = makeCandidate(match[1], match[2], baseOffset + (match.index ?? 0));
    if (candidate) candidates.push(candidate);
  }

  const lonThenLat = /\b(?:lon|lng|longitude)\s*[:=]?\s*([+-]?\d{1,3}(?:\.\d{1,12})?)[^\d+\-]{0,48}\b(?:lat|latitude)\s*[:=]?\s*([+-]?\d{1,3}(?:\.\d{1,12})?)/gi;
  for (const match of text.matchAll(lonThenLat)) {
    const candidate = makeCandidate(match[2], match[1], baseOffset + (match.index ?? 0));
    if (candidate) candidates.push(candidate);
  }
}

function readAttribute(attributes: string, names: readonly string[]) {
  const pattern = new RegExp(
    `\\b(?:${names.join("|")})\\s*=\\s*(?:["']([^"']+)["']|([^\\s>]+))`,
    "i",
  );
  const match = pattern.exec(attributes);
  return match?.[1] ?? match?.[2];
}

function scanGpx(text: string, baseOffset: number, candidates: Candidate[]) {
  const pointPattern = /<(trkpt|wpt|rtept)\b([^>]{0,1024}?)(?:\/\s*>|>([\s\S]{0,8192}?)<\/\1\s*>)/gi;

  for (const match of text.matchAll(pointPattern)) {
    const attributes = match[2] ?? "";
    const body = match[3] ?? "";
    const lat = readAttribute(attributes, ["lat", "latitude"]);
    const lon = readAttribute(attributes, ["lon", "lng", "longitude"]);
    const timeValue = /<time\b[^>]*>\s*([^<]+?)\s*<\/time\s*>/i.exec(body)?.[1];
    const relativeTime = /<(?:timeSeconds|time_seconds|elapsedSeconds)\b[^>]*>\s*([+-]?\d+(?:\.\d+)?)\s*<\//i.exec(body)?.[1];
    const parsedTime = timeValue ? Date.parse(timeValue) : Number.NaN;
    const candidate = makeCandidate(lat, lon, baseOffset + (match.index ?? 0), {
      timeSeconds: relativeTime,
      absoluteTimeMs: Number.isFinite(parsedTime) ? parsedTime : undefined,
    });
    if (candidate) candidates.push(candidate);
  }
}

function readJsonLikeNumber(objectText: string, names: readonly string[]) {
  const pattern = new RegExp(
    `(?:["']?(?:${names.join("|")})["']?)\\s*[:=]\\s*([+-]?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)`,
    "i",
  );
  return pattern.exec(objectText)?.[1];
}

function readJsonLikeString(objectText: string, names: readonly string[]) {
  const pattern = new RegExp(
    `(?:["']?(?:${names.join("|")})["']?)\\s*[:=]\\s*["']([^"']+)["']`,
    "i",
  );
  return pattern.exec(objectText)?.[1];
}

function scanJsonLikeCoordinates(text: string, baseOffset: number, candidates: Candidate[]) {
  const objectPattern = /\{[^{}]{0,2048}\}/g;

  for (const match of text.matchAll(objectPattern)) {
    const objectText = match[0];
    let lat = readJsonLikeNumber(objectText, ["latitude", "lat"]);
    let lon = readJsonLikeNumber(objectText, ["longitude", "lng", "lon"]);

    if (lat === undefined || lon === undefined) {
      const geoJsonCoordinates = /["']?coordinates["']?\s*[:=]\s*\[\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)(?:\s*,\s*[+-]?\d+(?:\.\d+)?)?\s*\]/i.exec(objectText);
      if (geoJsonCoordinates) {
        lon = geoJsonCoordinates[1];
        lat = geoJsonCoordinates[2];
      }
    }

    const accuracy = readJsonLikeNumber(objectText, ["horizontalAccuracy", "accuracy"]);
    let timeSeconds = readJsonLikeNumber(objectText, [
      "timeSeconds",
      "time_seconds",
      "elapsedSeconds",
      "elapsed",
      "offsetSeconds",
      "timeOffset",
    ]);

    const timestampText = readJsonLikeString(objectText, ["recordedAt", "timestamp", "time"]);
    const parsedTimestamp = timestampText ? Date.parse(timestampText) : Number.NaN;
    let absoluteTimeMs = Number.isFinite(parsedTimestamp) ? parsedTimestamp : undefined;

    if (absoluteTimeMs === undefined && timeSeconds === undefined) {
      const numericTimestamp = finiteNumber(readJsonLikeNumber(objectText, ["timestamp"]));
      if (numericTimestamp !== null) {
        if (numericTimestamp >= 1_000_000_000_000) absoluteTimeMs = numericTimestamp;
        else if (numericTimestamp >= 1_000_000_000) absoluteTimeMs = numericTimestamp * 1_000;
        else if (numericTimestamp >= 0) timeSeconds = String(numericTimestamp);
      }
    }

    const candidate = makeCandidate(lat, lon, baseOffset + (match.index ?? 0), {
      accuracy,
      timeSeconds,
      absoluteTimeMs,
    });
    if (candidate) candidates.push(candidate);
  }
}

function scanKml(text: string, baseOffset: number, candidates: Candidate[]) {
  const coordinatesBlockPattern = /<coordinates(?:\s[^>]*)?>([\s\S]{0,1048576}?)<\/coordinates\s*>/gi;
  for (const blockMatch of text.matchAll(coordinatesBlockPattern)) {
    const coordinateText = blockMatch[1] ?? "";
    const coordinatePattern = /([+-]?\d{1,3}(?:\.\d{1,12})?)\s*,\s*([+-]?\d{1,2}(?:\.\d{1,12})?)(?:\s*,\s*[+-]?\d+(?:\.\d+)?)?/g;

    for (const coordinateMatch of coordinateText.matchAll(coordinatePattern)) {
      const candidate = makeCandidate(
        coordinateMatch[2],
        coordinateMatch[1],
        baseOffset + (blockMatch.index ?? 0) + (coordinateMatch.index ?? 0),
      );
      if (candidate) candidates.push(candidate);
    }
  }

  const trackPattern = /<gx:Track\b[^>]*>([\s\S]{0,1048576}?)<\/gx:Track\s*>/gi;
  for (const trackMatch of text.matchAll(trackPattern)) {
    const trackText = trackMatch[1] ?? "";
    const times = Array.from(trackText.matchAll(/<when\b[^>]*>\s*([^<]+?)\s*<\/when\s*>/gi));
    const coordinates = Array.from(
      trackText.matchAll(/<gx:coord\b[^>]*>\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)(?:\s+[+-]?\d+(?:\.\d+)?)?\s*<\/gx:coord\s*>/gi),
    );

    const pairCount = Math.min(times.length, coordinates.length);
    for (let index = 0; index < pairCount; index += 1) {
      const timeMatch = times[index];
      const coordinateMatch = coordinates[index];
      const parsedTime = Date.parse(timeMatch[1] ?? "");
      const candidate = makeCandidate(
        coordinateMatch[2],
        coordinateMatch[1],
        baseOffset + (trackMatch.index ?? 0) + (coordinateMatch.index ?? 0),
        { absoluteTimeMs: Number.isFinite(parsedTime) ? parsedTime : undefined },
      );
      if (candidate) candidates.push(candidate);
    }
  }
}

function coordinateKey(point: GeoTrackPoint) {
  return `${point.lat.toFixed(8)},${point.lon.toFixed(8)}`;
}

function normalizeCandidates(candidates: Candidate[]) {
  candidates.sort((left, right) => left.sourceOffset - right.sourceOffset);

  const accepted: Candidate[] = [];
  const untimedByCoordinate = new Map<string, number>();
  const timedCoordinates = new Set<string>();
  const timedKeys = new Set<string>();

  for (const candidate of candidates) {
    const key = coordinateKey(candidate.point);
    const timeKey = candidate.point.timeSeconds !== undefined
      ? `relative:${candidate.point.timeSeconds.toFixed(6)}`
      : candidate.absoluteTimeMs !== undefined
        ? `absolute:${candidate.absoluteTimeMs}`
        : null;

    if (timeKey !== null) {
      const timedKey = `${key}|${timeKey}`;
      if (timedKeys.has(timedKey)) continue;

      const untimedIndex = untimedByCoordinate.get(key);
      const untimed = untimedIndex === undefined ? undefined : accepted[untimedIndex];
      if (untimedIndex !== undefined && untimed && Math.abs(untimed.sourceOffset - candidate.sourceOffset) <= DUPLICATE_METADATA_DISTANCE) {
        accepted[untimedIndex] = candidate;
        untimedByCoordinate.delete(key);
        timedCoordinates.add(key);
        timedKeys.add(timedKey);
        continue;
      }

      timedCoordinates.add(key);
      timedKeys.add(timedKey);
      accepted.push(candidate);
    } else {
      if (untimedByCoordinate.has(key) || timedCoordinates.has(key)) continue;
      untimedByCoordinate.set(key, accepted.length);
      accepted.push(candidate);
    }

    if (accepted.length >= MAX_TRACK_POINTS) break;
  }

  accepted.sort((left, right) => left.sourceOffset - right.sourceOffset);
  const absoluteBase = accepted.reduce<number | null>((minimum, candidate) => {
    if (candidate.absoluteTimeMs === undefined) return minimum;
    return minimum === null ? candidate.absoluteTimeMs : Math.min(minimum, candidate.absoluteTimeMs);
  }, null);

  return accepted.map(({ point, absoluteTimeMs }) => {
    if (point.timeSeconds !== undefined || absoluteTimeMs === undefined || absoluteBase === null) return point;
    return { ...point, timeSeconds: Math.max(0, (absoluteTimeMs - absoluteBase) / 1_000) };
  });
}

function scanText(text: string, baseOffset: number) {
  const candidates: Candidate[] = [];
  scanIso6709(text, baseOffset, candidates);
  scanGpx(text, baseOffset, candidates);
  scanKml(text, baseOffset, candidates);
  scanJsonLikeCoordinates(text, baseOffset, candidates);
  scanLabelledCoordinates(text, baseOffset, candidates);
  return candidates;
}

/**
 * Extracts coordinates from textual telemetry such as GPX, KML, JSON-like
 * records, labelled latitude/longitude pairs, and ISO 6709 values.
 */
export function extractGPSFromText(text: string): GeoExtractionResult {
  if (!text.trim()) return emptyResult();
  const track = normalizeCandidates(scanText(text, 0));
  return { track, hasGeoData: track.length > 0 };
}

function appendBytes(prefix: Uint8Array, suffix: Uint8Array) {
  if (prefix.length === 0) return suffix;
  const combined = new Uint8Array(prefix.length + suffix.length);
  combined.set(prefix, 0);
  combined.set(suffix, prefix.length);
  return combined;
}

/**
 * Scans textual video/container metadata in bounded chunks. This recognizes
 * common ISO 6709/QuickTime, labelled text, GPX, KML, and JSON-like forms.
 * It cannot read coordinates burned into video pixels; that requires OCR.
 */
export async function extractGPSFromVideoFile(file: File): Promise<GeoExtractionResult> {
  if (!file || file.size <= 0) return emptyResult();

  try {
    const decoder = new TextDecoder("windows-1252");
    const candidates: Candidate[] = [];
    let tail = new Uint8Array(0);
    let offset = 0;

    while (offset < file.size && candidates.length < MAX_TRACK_POINTS * 4) {
      const end = Math.min(file.size, offset + CHUNK_BYTES);
      const current = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      const combined = appendBytes(tail, current);
      const baseOffset = offset - tail.length;
      candidates.push(...scanText(decoder.decode(combined), baseOffset));

      const tailStart = Math.max(0, combined.length - OVERLAP_BYTES);
      tail = combined.slice(tailStart);
      offset = end;
    }

    const track = normalizeCandidates(candidates);
    return { track, hasGeoData: track.length > 0 };
  } catch {
    return emptyResult();
  }
}
