import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_KML_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export class KmlSourceError extends Error {
  constructor(message: string, readonly status: number = 502) {
    super(message);
  }
}

export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  const value = mapped ? mapped[1] : address;
  if (isIP(value) === 4) {
    const [a, b] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || a >= 224;
  }
  const lower = value.toLowerCase();
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
}

type Resolver = (hostname: string) => Promise<string[]>;

const resolveAddresses: Resolver = async hostname =>
  (await lookup(hostname, { all: true })).map(entry => entry.address);

export async function assertPublicKmlUrl(rawUrl: string, resolve: Resolver = resolveAddresses): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new KmlSourceError("The project KML link is not a valid URL.", 422);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new KmlSourceError("The project KML link must use http or https.", 422);
  }
  if (url.username || url.password) {
    throw new KmlSourceError("The project KML link must not contain credentials.", 422);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
    throw new KmlSourceError("The project KML link points to a non-public host.", 422);
  }
  const addresses = isIP(hostname) ? [hostname] : await resolve(hostname);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new KmlSourceError("The project KML link points to a non-public host.", 422);
  }
  return url;
}

async function readBounded(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_KML_BYTES) throw new KmlSourceError("The KML file is too large.", 413);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_KML_BYTES) {
      await reader.cancel();
      throw new KmlSourceError("The KML file is too large.", 413);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Fetches a project's KML while refusing non-public hosts, unbounded redirects and oversized bodies. */
export async function fetchKml(
  rawUrl: string,
  deps: { fetch?: typeof fetch; resolve?: Resolver } = {},
): Promise<string> {
  const doFetch = deps.fetch ?? fetch;
  let current = await assertPublicKmlUrl(rawUrl, deps.resolve);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await doFetch(current, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = await assertPublicKmlUrl(new URL(location, current).toString(), deps.resolve);
      continue;
    }
    if (!response.ok) throw new KmlSourceError(`Failed to fetch KML from source: ${response.statusText}`);
    return readBounded(response);
  }
  throw new KmlSourceError("The KML source redirected too many times.");
}
