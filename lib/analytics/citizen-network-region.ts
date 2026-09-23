import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export type ApproximateNetworkRegion = {
  code: string;
  label: string;
};

type NetworkGeoResult = {
  countryCode?: string | null;
  subdivisionNames?: string[];
};

function isPublicIpv4(value: string) {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIp(value: string) {
  const version = isIP(value);
  if (version === 4) return isPublicIpv4(value);
  if (version !== 6) return false;
  const normalized = value.toLowerCase();
  return normalized !== "::" && normalized !== "::1"
    && !normalized.startsWith("fc")
    && !normalized.startsWith("fd")
    && !normalized.startsWith("fe8")
    && !normalized.startsWith("fe9")
    && !normalized.startsWith("fea")
    && !normalized.startsWith("feb")
    && !normalized.startsWith("ff")
    && !normalized.startsWith("2001:db8:");
}

export function extractTrustedPublicIp(headers: Headers, trustProxyHeaders: boolean): string | null {
  if (!trustProxyHeaders) return null;
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && isPublicIp(realIp)) return realIp;

  const forwarded = headers.get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = forwarded?.at(-1);
  return candidate && isPublicIp(candidate) ? candidate : null;
}

export function hasTrustedAnalyticsProxy(
  headers: Headers,
  trustProxyHeaders: boolean,
  configuredSecret: string | undefined,
) {
  if (!trustProxyHeaders || !configuredSecret || configuredSecret.length < 32) return false;
  const received = headers.get("x-infrawatch-proxy-secret") ?? "";
  const expectedBuffer = Buffer.from(configuredSecret);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function resolveApproximateNetworkRegion({
  ip,
  lookup,
  findCanonicalRegion,
}: {
  ip: string;
  lookup: (ip: string) => Promise<NetworkGeoResult | null>;
  findCanonicalRegion: (subdivisionName: string) => Promise<ApproximateNetworkRegion | null>;
}): Promise<ApproximateNetworkRegion | null> {
  try {
    const result = await lookup(ip);
    if (result?.countryCode !== "PH") return null;

    for (const subdivisionName of result.subdivisionNames ?? []) {
      const normalized = subdivisionName.trim();
      if (!normalized || normalized.length > 100) continue;
      const region = await findCanonicalRegion(normalized);
      if (region) return region;
    }
    return null;
  } catch {
    return null;
  }
}
