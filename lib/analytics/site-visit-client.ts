import type { CitizenEngagementRouteTemplate } from "./citizen-event-policy";
import { sendCitizenEngagementEvent } from "./citizen-event-client";

const VISIT_STORAGE_KEY = "infrawatch:visit-key";

// Used only when sessionStorage is unavailable (private mode, blocked storage). The token
// then lives for the page lifecycle, so a full reload may count as a second visit.
let inMemoryVisitKey: string | null = null;

export function routeTemplateForPathname(pathname: string): CitizenEngagementRouteTemplate {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return "/";
  if (path === "/projects") return "/projects";
  if (/^\/projects\/[^/]+$/.test(path)) return "/projects/[id]";
  if (path === "/map") return "/map";
  return "other";
}

type VisitStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Returns a fresh visit token the first time it is called in a browser session and `null`
 * afterwards, so each session reports exactly one site visit no matter how many pages it opens.
 */
export function claimSiteVisitKey(
  storage: VisitStorage | null,
  createKey: () => string = () => crypto.randomUUID(),
): string | null {
  try {
    if (storage) {
      if (storage.getItem(VISIT_STORAGE_KEY)) return null;
      const key = createKey();
      storage.setItem(VISIT_STORAGE_KEY, key);
      return key;
    }
  } catch {
    // Fall through to the in-memory token.
  }
  if (inMemoryVisitKey) return null;
  inMemoryVisitKey = createKey();
  return inMemoryVisitKey;
}

export function resetSiteVisitMemoryForTests() {
  inMemoryVisitKey = null;
}

export async function reportSiteVisit(
  pathname: string,
  storage: VisitStorage | null = typeof window === "undefined" ? null : safeSessionStorage(),
): Promise<boolean> {
  const visitKey = claimSiteVisitKey(storage);
  if (!visitKey) return false;
  return sendCitizenEngagementEvent({
    eventName: "site_visit",
    routeTemplate: routeTemplateForPathname(pathname),
    entrySurface: "landing",
    visitKey,
  });
}

function safeSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
