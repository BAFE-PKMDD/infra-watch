// Maintenance mode and public banner rules. Pure functions only, so the behavior can be
// unit-tested without a browser or database. Storage lives in the `system_settings` table
// (see actions/query/settings.query.ts and actions/mutation/settings.mutation.ts).

import { BannerSettingsSchema, DEFAULT_BANNER_SETTINGS, type BannerSettings } from "@/types/banner.types";

export const MAINTENANCE_SETTING_KEY = "maintenance_mode";
export const BANNER_SETTING_KEY = "public_banner";
export const SITE_NOTICES_QUERY_KEY = ["site-notices"] as const;
export const SITE_NOTICES_ENDPOINT = "/api/public/site-notices";

// Minimum contrast between banner background and text (WCAG AA for normal text).
export const MIN_BANNER_CONTRAST = 4.5;

// Staff keep working while the public sees the maintenance notice.
const MAINTENANCE_EXEMPT_ROLES = new Set(["admin", "regional_admin", "moderator"]);

// Staff must be able to reach the sign-in screen while the site is locked for everyone else.
const MAINTENANCE_EXEMPT_PATHS = ["/sign-in", "/forget-password"];

export type SiteNotices = {
  maintenance: boolean;
  /** Present only when the banner is switched on. */
  banner: BannerSettings | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Stored as a boolean, but tolerate "true"/"1" strings from manual database edits. */
export function parseMaintenanceValue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

/** Merges the stored value over the defaults. Anything invalid falls back to the (off) defaults. */
export function parseBannerSettings(value: unknown): BannerSettings {
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = null;
    }
  }

  const parsed = BannerSettingsSchema.safeParse({
    ...DEFAULT_BANNER_SETTINGS,
    ...(isRecord(raw) ? raw : {}),
  });
  return parsed.success ? parsed.data : { ...DEFAULT_BANNER_SETTINGS };
}

export function buildSiteNotices(maintenanceValue: unknown, bannerValue: unknown): SiteNotices {
  const banner = parseBannerSettings(bannerValue);
  return {
    maintenance: parseMaintenanceValue(maintenanceValue),
    banner: banner.isEnabled ? banner : null,
  };
}

export function isMaintenanceExemptRole(role: string | null | undefined): boolean {
  return Boolean(role) && MAINTENANCE_EXEMPT_ROLES.has(role as string);
}

export function isMaintenanceExemptPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return MAINTENANCE_EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Whether to cover the page with the maintenance notice. While the session is still loading we
 * show nothing, so staff never see the notice flash before their role is known.
 */
export function shouldShowMaintenance(input: {
  maintenance: boolean;
  authLoading: boolean;
  role: string | null | undefined;
  pathname: string | null | undefined;
}): boolean {
  if (!input.maintenance) return false;
  if (isMaintenanceExemptPath(input.pathname)) return false;
  if (input.authLoading) return false;
  return !isMaintenanceExemptRole(input.role);
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number | null {
  if (!/^#[0-9A-F]{6}$/i.test(hex)) return null;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channelToLinear(red) + 0.7152 * channelToLinear(green) + 0.0722 * channelToLinear(blue);
}

/** WCAG contrast ratio between two #RRGGBB colors (1 to 21), or null for a malformed color. */
export function contrastRatio(colorA: string, colorB: string): number | null {
  const a = relativeLuminance(colorA);
  const b = relativeLuminance(colorB);
  if (a === null || b === null) return null;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns an error message when the banner colors are hard to read, otherwise null. */
export function bannerContrastError(settings: Pick<BannerSettings, "backgroundColor" | "textColor">): string | null {
  const ratio = contrastRatio(settings.backgroundColor, settings.textColor);
  if (ratio === null) return "Invalid color format";
  if (ratio < MIN_BANNER_CONTRAST) {
    return `Text and background colors are too similar to read comfortably (contrast ${ratio.toFixed(1)}:1, needs at least ${MIN_BANNER_CONTRAST}:1).`;
  }
  return null;
}
