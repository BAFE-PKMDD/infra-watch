"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  buildGtagInitScript,
  gaDisableFlag,
  hasAnalyticsConsent,
  normalizeMeasurementId,
} from "@/lib/analytics/google-analytics";

// NEXT_PUBLIC_* is inlined at build time (see the Dockerfile ARG). Empty or malformed
// means analytics is off, so local and staging builds never report to the live property.
const MEASUREMENT_ID = normalizeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void } & Record<string, unknown>;

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onStoreChange);
  };
}

function getConsentSnapshot() {
  try {
    return hasAnalyticsConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return false;
  }
}

function getServerConsentSnapshot() {
  return false;
}

/**
 * Google Analytics 4, loaded only after the visitor accepts analytics in the cookie banner.
 *
 * Mount it in the public layout only. gtag keeps listening to history changes once loaded, so
 * leaving the public pages (sign-in, citizen, or admin) unmounts this component, which sets
 * the property's `ga-disable` flag and stops reporting for those pages.
 */
export function GoogleAnalytics() {
  const consented = useSyncExternalStore(subscribe, getConsentSnapshot, getServerConsentSnapshot);
  // Read during the first render, before <Script> below can inject anything, so it only
  // reflects a script left over from earlier public pages (this component remounting).
  const [scriptWasLoadedAtMount] = useState(
    () => typeof window !== "undefined" && typeof (window as GtagWindow).gtag === "function",
  );
  const reportedReturnVisit = useRef(false);

  useEffect(() => {
    if (!MEASUREMENT_ID) return;
    const target = window as GtagWindow;
    const flag = gaDisableFlag(MEASUREMENT_ID);

    target[flag] = !consented;
    // Coming back to the public pages after the script already loaded: the navigation that
    // brought us here happened while reporting was off, so record this page explicitly.
    // A first-time load needs no manual event; gtag('config') reports the first page itself.
    if (consented && scriptWasLoadedAtMount && !reportedReturnVisit.current && typeof target.gtag === "function") {
      reportedReturnVisit.current = true;
      target.gtag("event", "page_view", {
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    return () => {
      target[flag] = true;
    };
  }, [consented, scriptWasLoadedAtMount]);

  if (!MEASUREMENT_ID || !consented) return null;

  return (
    <>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {buildGtagInitScript(MEASUREMENT_ID)}
      </Script>
    </>
  );
}
