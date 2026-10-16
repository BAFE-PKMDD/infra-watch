// Google Analytics 4 helpers. Pure functions only, so the consent rules can be unit-tested
// without a browser. The component that loads the script is components/analytics/google-analytics.tsx.

// Written by the cookie banner (components/cookie-consent/cookie-consent-banner.tsx).
export const COOKIE_CONSENT_STORAGE_KEY = "cookie_consent";

// The browser's `storage` event only fires in other tabs, so the banner dispatches this on
// the current window to tell the analytics loader the visitor just made a choice.
export const COOKIE_CONSENT_CHANGED_EVENT = "infrawatch:cookie-consent-changed";

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

/** Returns the trimmed Measurement ID, or null when it is missing or not a GA4 `G-` ID. */
export function normalizeMeasurementId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && MEASUREMENT_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/** True only when the stored choice explicitly allows analytics. Anything else means no. */
export function hasAnalyticsConsent(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && (parsed as { analytics?: unknown }).analytics === true;
  } catch {
    return false;
  }
}

/** Setting this window property to true makes gtag.js stop sending data for the property. */
export function gaDisableFlag(measurementId: string): string {
  return `ga-disable-${measurementId}`;
}

/** Inline gtag bootstrap. Advertising features stay off; only usage measurement is configured. */
export function buildGtagInitScript(measurementId: string): string {
  const id = JSON.stringify(measurementId);
  return [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag = window.gtag || gtag;",
    "gtag('js', new Date());",
    `gtag('config', ${id}, { allow_google_signals: false, allow_ad_personalization_signals: false });`,
  ].join("\n");
}
