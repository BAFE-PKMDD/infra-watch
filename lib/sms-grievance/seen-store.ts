import { useMemo, useSyncExternalStore } from "react";

import type { SmsSeenMap } from "@/lib/sms-grievance/attention";

// Which SMS messages this browser has opened. Kept per browser on purpose: it only decides
// whether to draw the red "New" markers for the person looking at the screen, not anything
// the team shares, so it needs no database and never affects another staff member.
const STORAGE_KEY = "infrawatch.sms-seen.v1";
const CHANGE_EVENT = "infrawatch:sms-seen";
const MAX_ENTRIES = 500;

export function parseSeen(raw: string | null | undefined): SmsSeenMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

// A new map with `id` marked as seen up to `stamp`; the same map back if that is no news.
// The oldest entries are dropped past a cap so the stored value can't grow forever.
export function withSeen(seen: SmsSeenMap, id: string, stamp: string): SmsSeenMap {
  const current = seen[id];
  if (current && new Date(current).getTime() >= new Date(stamp).getTime()) return seen;
  const next = { ...seen };
  delete next[id];
  next[id] = stamp;
  const keys = Object.keys(next);
  if (keys.length <= MAX_ENTRIES) return next;
  return Object.fromEntries(keys.slice(keys.length - MAX_ENTRIES).map((key) => [key, next[key]]));
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function markSmsSeen(id: string, stamp: string) {
  try {
    const current = parseSeen(readRaw());
    const next = withSeen(current, id, stamp);
    if (next === current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage can be blocked or full; the marker just stays until it can be saved.
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Re-renders when this tab or another one opens a message. Empty on the server, so
// everything starts out unseen until the browser's own record is read.
export function useSmsSeen(): SmsSeenMap {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parseSeen(raw), [raw]);
}
