import { isNotNull } from "drizzle-orm";
import { GeoIpDbName, open as openGeoIpDatabase } from "geolite2-redist";
import maxmind, { type CityResponse } from "maxmind";

import { db } from "@/lib/db";
import { psgcLocations } from "@/lib/db/schema";
import {
  extractTrustedPublicIp,
  hasTrustedAnalyticsProxy,
  resolveApproximateNetworkRegion,
  type ApproximateNetworkRegion,
} from "./citizen-network-region";

type RegionDirectoryRow = {
  provinceName: string | null;
  regionName: string;
  code: string | null;
};

function normalizeGeographicName(value: string | null) {
  return value
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase() ?? "";
}

const REGION_ALIASES: Record<string, string> = {
  "METRO MANILA": "PH130000000",
  "NATIONAL CAPITAL REGION": "PH130000000",
  "NATIONAL CAPITAL REGION (NCR)": "PH130000000",
};

export function chooseCanonicalNetworkRegion(
  subdivisionName: string,
  rows: RegionDirectoryRow[],
): ApproximateNetworkRegion | null {
  const normalized = normalizeGeographicName(subdivisionName);
  if (!normalized) return null;

  const aliasCode = REGION_ALIASES[normalized];
  const matches = rows.filter((row) => {
    if (!row.code) return false;
    if (aliasCode) return row.code === aliasCode;
    return normalizeGeographicName(row.provinceName) === normalized
      || normalizeGeographicName(row.regionName) === normalized;
  });
  const codes = new Set(matches.map((row) => row.code).filter((value): value is string => Boolean(value)));
  if (codes.size !== 1) return null;

  const code = [...codes][0];
  const row = matches.find((candidate) => candidate.code === code);
  return row ? { code, label: row.regionName.trim() } : null;
}

let regionDirectoryPromise: Promise<RegionDirectoryRow[]> | null = null;
function getRegionDirectory() {
  regionDirectoryPromise ??= db.selectDistinct({
    provinceName: psgcLocations.provinceName,
    regionName: psgcLocations.regionName,
    code: psgcLocations.phcodeReg,
  })
    .from(psgcLocations)
    .where(isNotNull(psgcLocations.phcodeReg));
  return regionDirectoryPromise;
}

type CityReader = { get: (ip: string) => CityResponse | null; close: () => void };
let cityReaderPromise: Promise<CityReader> | null = null;
function getCityReader() {
  cityReaderPromise ??= openGeoIpDatabase(
    GeoIpDbName.City,
    async (databasePath) => {
      const reader = await maxmind.open<CityResponse>(databasePath);
      return {
        get: (ip: string) => reader.get(ip),
      };
    },
  );
  return cityReaderPromise;
}

async function lookupLocalNetworkGeography(ip: string) {
  const reader = await getCityReader();
  const result = reader.get(ip) as CityResponse | null;
  return result ? {
    countryCode: result.country?.iso_code ?? null,
    subdivisionNames: result.subdivisions
      ?.map((subdivision) => subdivision.names?.en)
      .filter((value): value is string => Boolean(value)) ?? [],
  } : null;
}

export async function resolveRequestNetworkRegion(request: Request) {
  const trustedProxy = hasTrustedAnalyticsProxy(
    request.headers,
    process.env.ANALYTICS_TRUST_PROXY_HEADERS === "true",
    process.env.ANALYTICS_PROXY_SECRET,
  );
  const ip = extractTrustedPublicIp(request.headers, trustedProxy);
  if (!ip) return null;

  return resolveApproximateNetworkRegion({
    ip,
    lookup: lookupLocalNetworkGeography,
    findCanonicalRegion: async (subdivisionName) => chooseCanonicalNetworkRegion(
      subdivisionName,
      await getRegionDirectory(),
    ),
  });
}
