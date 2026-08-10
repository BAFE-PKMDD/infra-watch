import { extractGPSFromText, type GeoExtractionResult } from "@/lib/geo-video-parser";
import {
  isGpsInfoSidecar,
  MAX_GPS_INFO_BYTES,
} from "@/lib/geo-sidecar-file";
import type { GeoTrackPoint } from "@/types/geo-evidence.types";

type ParsedPoint = GeoTrackPoint & {
  absoluteTimeMs?: number;
  order: number;
};

export type GeoSidecarFormat = "da-gps-index" | "json" | "delimited" | "xml-or-text";

export type GeoSidecarExtractionResult = GeoExtractionResult & {
  format: GeoSidecarFormat;
  error?: string;
};

const MAX_TRACK_POINTS = 10_000;
const MAX_TRACK_TIME_SECONDS = 7 * 24 * 60 * 60;
const LATITUDE_KEYS = new Set(["lat", "latitude", "gpslat", "gpslatitude"]);
const LONGITUDE_KEYS = new Set(["lon", "lng", "long", "longitude", "gpslon", "gpslng", "gpslongitude"]);
const ACCURACY_KEYS = new Set(["accuracy", "acc", "horizontalaccuracy", "gpsaccuracy"]);
const RELATIVE_TIME_KEYS = new Set([
  "timeseconds",
  "elapsedseconds",
  "elapsed",
  "offsetseconds",
  "timeoffset",
  "videotime",
  "videotimeseconds",
]);
const ABSOLUTE_TIME_KEYS = new Set([
  "timestamp",
  "recordedat",
  "datetime",
  "dateandtime",
  "utc",
  "utctime",
  "gpstime",
  "time",
]);

function normalizedKey(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function finiteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function strictFiniteNumber(value: string) {
  const trimmed = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function validCoordinates(lat: number | null, lon: number | null): lat is number {
  return lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function temporalValue(value: unknown, forceRelative = false) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};

    const clock = /^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(trimmed);
    if (clock) {
      return {
        absoluteTimeMs: (
          (Number(clock[1]) * 60 * 60)
          + (Number(clock[2]) * 60)
          + Number(clock[3])
        ) * 1_000,
      };
    }

    const parsedDate = Date.parse(trimmed);
    if (Number.isFinite(parsedDate) && /[-T/]|(?:am|pm)|z$/i.test(trimmed)) {
      return { absoluteTimeMs: parsedDate };
    }
  }

  const numeric = finiteNumber(value);
  if (numeric === null || numeric < 0) return {};
  if (forceRelative) return { timeSeconds: numeric };
  if (numeric >= 1_000_000_000_000) return { absoluteTimeMs: numeric };
  if (numeric >= 1_000_000_000) return { absoluteTimeMs: numeric * 1_000 };
  return { timeSeconds: numeric };
}

function recordValue(record: Record<string, unknown>, keys: ReadonlySet<string>) {
  for (const [key, value] of Object.entries(record)) {
    if (keys.has(normalizedKey(key))) return value;
  }
  return undefined;
}

function pointFromRecord(record: Record<string, unknown>, order: number): ParsedPoint | null {
  const lat = finiteNumber(recordValue(record, LATITUDE_KEYS));
  const lon = finiteNumber(recordValue(record, LONGITUDE_KEYS));
  if (!validCoordinates(lat, lon)) return null;

  const point: ParsedPoint = { lat, lon: lon as number, order };
  const accuracy = finiteNumber(recordValue(record, ACCURACY_KEYS));
  if (accuracy !== null && accuracy >= 0) point.accuracy = accuracy;

  const relativeTime = recordValue(record, RELATIVE_TIME_KEYS);
  const absoluteTime = recordValue(record, ABSOLUTE_TIME_KEYS);
  const timing = relativeTime !== undefined
    ? temporalValue(relativeTime, true)
    : temporalValue(absoluteTime);
  if (timing.timeSeconds !== undefined) point.timeSeconds = timing.timeSeconds;
  if (timing.absoluteTimeMs !== undefined) point.absoluteTimeMs = timing.absoluteTimeMs;
  return point;
}

function videoTimeSeconds(value: string) {
  const trimmed = value.trim();
  const clock = /^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(trimmed);
  if (clock) {
    const hours = Number(clock[1] ?? 0);
    const minutes = Number(clock[2]);
    const seconds = Number(clock[3]);
    if (minutes <= 59 && seconds < 60) return (hours * 3_600) + (minutes * 60) + seconds;
  }

  const numeric = strictFiniteNumber(trimmed);
  return numeric !== null && numeric >= 0 ? numeric : undefined;
}

/** Parses the native DA GeoCamera route record: LAT;LON;VIDEO_TIME. */
function parseDaGpsIndexPoints(text: string) {
  const points: ParsedPoint[] = [];
  const recordPattern = /<GPSIndex\b[^>]*>\s*([^<]+?)\s*<\/GPSIndex\s*>/gi;

  for (const match of text.matchAll(recordPattern)) {
    const fields = (match[1] ?? "").split(";").map((field) => field.trim());
    if (fields.length !== 3) continue;
    const lat = strictFiniteNumber(fields[0]);
    const lon = strictFiniteNumber(fields[1]);
    if (!validCoordinates(lat, lon)) continue;

    const timeSeconds = videoTimeSeconds(fields[2]);
    if (timeSeconds === undefined) continue;
    points.push({ lat, lon: lon as number, order: points.length, timeSeconds });
  }

  return points;
}

function hasTimeRegression(points: ParsedPoint[]) {
  let previousTime = -1;
  for (const point of points) {
    const timeSeconds = point.timeSeconds;
    if (typeof timeSeconds !== "number") continue;
    if (timeSeconds < previousTime) return true;
    previousTime = timeSeconds;
  }
  return false;
}

function collectJsonPoints(value: unknown, points: ParsedPoint[], seen: Set<object>, depth = 0) {
  if (!value || typeof value !== "object" || depth > 20 || seen.has(value)) return;
  seen.add(value);

  if (!Array.isArray(value)) {
    const point = pointFromRecord(value as Record<string, unknown>, points.length);
    if (point) points.push(point);
  }

  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) collectJsonPoints(child, points, seen, depth + 1);
}

function parseJsonPoints(text: string) {
  const points: ParsedPoint[] = [];
  try {
    collectJsonPoints(JSON.parse(text), points, new Set());
    if (points.length > 0) return points;
  } catch {
    // DA releases may use one JSON object per line instead of one root value.
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/,$/, "");
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) continue;
    try {
      collectJsonPoints(JSON.parse(trimmed), points, new Set());
    } catch {
      // Continue to delimited and text scanners below.
    }
  }
  return points;
}

function splitDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

function delimiterForLine(line: string) {
  const candidates = [",", "\t", ";", "|"];
  let selected = ",";
  let selectedCount = -1;
  for (const candidate of candidates) {
    const count = line.split(candidate).length - 1;
    if (count > selectedCount) {
      selected = candidate;
      selectedCount = count;
    }
  }
  return selectedCount > 0 ? selected : null;
}

function parseHeaderDelimitedPoints(lines: string[]) {
  for (let headerIndex = 0; headerIndex < Math.min(lines.length, 30); headerIndex += 1) {
    const delimiter = delimiterForLine(lines[headerIndex]);
    if (!delimiter) continue;
    const headers = splitDelimitedLine(lines[headerIndex], delimiter);
    const normalizedHeaders = headers.map(normalizedKey);
    if (!normalizedHeaders.some((key) => LATITUDE_KEYS.has(key))
      || !normalizedHeaders.some((key) => LONGITUDE_KEYS.has(key))) continue;

    const points: ParsedPoint[] = [];
    for (let index = headerIndex + 1; index < lines.length; index += 1) {
      const values = splitDelimitedLine(lines[index], delimiter);
      if (values.length < 2) continue;
      const record: Record<string, unknown> = {};
      headers.forEach((header, column) => {
        if (column < values.length) record[header] = values[column];
      });
      const point = pointFromRecord(record, points.length);
      if (point) points.push(point);
    }
    if (points.length > 0) return points;
  }
  return [];
}

function parseUnlabelledDelimitedPoints(lines: string[]) {
  const points: ParsedPoint[] = [];
  for (const line of lines) {
    const delimiter = delimiterForLine(line);
    if (!delimiter) continue;
    const values = splitDelimitedLine(line, delimiter);
    const numbers = values.map(finiteNumber);

    for (let index = 0; index + 1 < numbers.length; index += 1) {
      const first = numbers[index];
      const second = numbers[index + 1];
      if (first === null || second === null) continue;

      let lat: number | null = null;
      let lon: number | null = null;
      if (first >= -90 && first <= 90 && second >= -180 && second <= 180 && Math.abs(second) > 90) {
        lat = first;
        lon = second;
      } else if (first >= -180 && first <= 180 && Math.abs(first) > 90 && second >= -90 && second <= 90) {
        lat = second;
        lon = first;
      }
      if (!validCoordinates(lat, lon)) continue;

      const point: ParsedPoint = { lat, lon: lon as number, order: points.length };
      const timestampValue = values.find((value, valueIndex) => {
        if (valueIndex === index || valueIndex === index + 1) return false;
        return /[-T/]|\d{1,2}:\d{2}:\d{2}|(?:am|pm)|z$/i.test(value.trim());
      });
      const timing = temporalValue(timestampValue);
      if (timing.absoluteTimeMs !== undefined) point.absoluteTimeMs = timing.absoluteTimeMs;
      points.push(point);
      break;
    }
  }
  return points;
}

function downsample(points: GeoTrackPoint[]) {
  if (points.length <= MAX_TRACK_POINTS) return points;
  const sampled: GeoTrackPoint[] = [];
  const finalIndex = points.length - 1;
  for (let index = 0; index < MAX_TRACK_POINTS; index += 1) {
    sampled.push(points[Math.round((index * finalIndex) / (MAX_TRACK_POINTS - 1))]);
  }
  return sampled;
}

function toTrackPoint(point: ParsedPoint, timeSeconds?: number): GeoTrackPoint {
  return {
    lat: point.lat,
    lon: point.lon,
    ...(typeof point.accuracy === "number" ? { accuracy: point.accuracy } : {}),
    ...(typeof timeSeconds === "number" ? { timeSeconds } : {}),
  };
}

function normalizeParsedPoints(points: ParsedPoint[]) {
  if (points.length === 0) return [];
  const absoluteTimes = points.map((point) => point.absoluteTimeMs);
  const hasAbsoluteTimes = absoluteTimes.every((value) => typeof value === "number" && Number.isFinite(value));
  const hasRelativeTimes = points.every((point) => typeof point.timeSeconds === "number" && Number.isFinite(point.timeSeconds));
  let normalized = points.map((point) => toTrackPoint(point, point.timeSeconds));

  if (hasAbsoluteTimes) {
    const base = Math.min(...absoluteTimes as number[]);
    normalized = points
      .map((point) => toTrackPoint(
        point,
        Math.max(0, ((point.absoluteTimeMs as number) - base) / 1_000),
      ))
      .sort((left, right) => (left.timeSeconds ?? 0) - (right.timeSeconds ?? 0));
  } else if (hasRelativeTimes) {
    const chronological: GeoTrackPoint[] = [];
    let previousTime = -1;
    for (const point of normalized) {
      const timeSeconds = point.timeSeconds as number;
      if (timeSeconds > MAX_TRACK_TIME_SECONDS) continue;
      if (timeSeconds < previousTime) break;
      chronological.push(point);
      previousTime = timeSeconds;
    }
    normalized = chronological;
  } else {
    normalized = points.map((point) => toTrackPoint(point));
  }

  const deduplicated: GeoTrackPoint[] = [];
  const seen = new Set<string>();
  for (const point of normalized) {
    const key = `${point.lat.toFixed(8)}:${point.lon.toFixed(8)}:${point.timeSeconds?.toFixed(3) ?? "untimed"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduplicated.push(point);
  }
  return downsample(deduplicated);
}

function normalizeFallbackTrack(result: GeoExtractionResult) {
  return downsample(result.track.filter((point) => (
    Number.isFinite(point.lat)
    && point.lat >= -90
    && point.lat <= 90
    && Number.isFinite(point.lon)
    && point.lon >= -180
    && point.lon <= 180
  )));
}

export function extractGPSFromInfoText(text: string): GeoSidecarExtractionResult {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\0/g, "").trim();
  if (!cleaned) return { track: [], hasGeoData: false, format: "xml-or-text" };

  if (/<GPSIndex\b/i.test(cleaned)) {
    const daPoints = parseDaGpsIndexPoints(cleaned);
    if (hasTimeRegression(daPoints)) {
      return {
        track: [],
        hasGeoData: false,
        format: "da-gps-index",
        error: "This .gps.info file contains multiple recording sessions (the video clock resets). Export a clean matching pair from DA GeoCamera.",
      };
    }
    const daTrack = normalizeParsedPoints(daPoints);
    return { track: daTrack, hasGeoData: daTrack.length > 0, format: "da-gps-index" };
  }

  const jsonTrack = normalizeParsedPoints(parseJsonPoints(cleaned));
  if (jsonTrack.length > 0) return { track: jsonTrack, hasGeoData: true, format: "json" };

  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerPoints = parseHeaderDelimitedPoints(lines);
  const delimitedTrack = normalizeParsedPoints(
    headerPoints.length > 0 ? headerPoints : parseUnlabelledDelimitedPoints(lines),
  );
  if (delimitedTrack.length > 0) {
    return { track: delimitedTrack, hasGeoData: true, format: "delimited" };
  }

  const fallbackTrack = normalizeFallbackTrack(extractGPSFromText(cleaned));
  return {
    track: fallbackTrack,
    hasGeoData: fallbackTrack.length > 0,
    format: "xml-or-text",
  };
}

function decodeSidecar(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new Error("This GPS sidecar is compressed. Export the original .gps.info text file from DA GeoCamera.");
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  const sampleLength = Math.min(bytes.length, 4_096);
  let oddNulls = 0;
  for (let index = 1; index < sampleLength; index += 2) {
    if (bytes[index] === 0) oddNulls += 1;
  }
  if (sampleLength > 8 && oddNulls > sampleLength / 8) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export async function extractGPSFromInfoFile(file: File): Promise<GeoSidecarExtractionResult> {
  if (!isGpsInfoSidecar(file)) {
    throw new Error("Choose a DA GeoCamera .gps.info file (Windows may rename it to _gps[1].info).");
  }
  if (file.size <= 0) throw new Error("The DA GeoCamera GPS sidecar is empty.");
  if (file.size > MAX_GPS_INFO_BYTES) {
    throw new Error("The DA GeoCamera GPS sidecar exceeds the 10 MB safety limit.");
  }

  const result = extractGPSFromInfoText(decodeSidecar(await file.arrayBuffer()));
  if (!result.hasGeoData) {
    throw new Error(result.error ?? "No readable coordinate route was found in this .gps.info file.");
  }
  return result;
}
