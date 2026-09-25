"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const CONSENT_STORAGE_KEY = "cookie_consent";

// storage events only fire in *other* tabs, but that's fine here: we only need
// this to reflect an existing decision at mount, not live-sync across tabs.
function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getStoredConsentSnapshot() {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

// SSR has no localStorage; treat "undecided" as the safe default so hydration
// only ever has to reconcile from "showing" to "hidden", never the reverse.
function getServerConsentSnapshot() {
  return null;
}

function storeConsent(analytics: boolean) {
  try {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ essential: true, analytics, decidedAt: new Date().toISOString() }),
    );
  } catch {
    // Ignore storage errors (private browsing, quota, etc.) - the banner will just reappear.
  }
}

export function CookieConsentBanner() {
  const storedConsent = useSyncExternalStore(
    subscribeToStorage,
    getStoredConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [dismissedThisVisit, setDismissedThisVisit] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const isOpen = storedConsent === null && !dismissedThisVisit;

  const finish = (analytics: boolean) => {
    storeConsent(analytics);
    setDismissedThisVisit(true);
    setIsCustomizing(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Cookie className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cookie Preferences</h2>
              <button
                type="button"
                onClick={() => setDismissedThisVisit(true)}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                aria-label="Dismiss cookie preferences for now"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              We use essential cookies to keep you signed in and to protect features such as the AI assistant from abuse.
              InfraWatch does not currently use analytics or advertising cookies; the toggle below is provided in case that changes.
            </p>

            {isCustomizing && (
              <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Essential</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sign-in and abuse-prevention cookies. Required for the site to function.
                    </p>
                  </div>
                  <Switch checked disabled aria-label="Essential cookies (always on)" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Analytics</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Not currently used by InfraWatch. Your choice is saved for if this changes.
                    </p>
                  </div>
                  <Switch
                    checked={analyticsEnabled}
                    onCheckedChange={setAnalyticsEnabled}
                    aria-label="Analytics cookies"
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => finish(true)}
                className="h-9 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Accept All
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => finish(false)}
                className="h-9"
              >
                Essential Only
              </Button>
              {isCustomizing ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => finish(analyticsEnabled)} className="h-9">
                  Save Preferences
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(true)}
                  className="inline-flex h-9 items-center gap-1 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:text-white"
                >
                  Customize
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
              )}
              {isCustomizing && (
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="inline-flex h-9 items-center gap-1 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:text-white"
                >
                  Hide options
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              For more information, please read our{" "}
              <Link href="/data-privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                Privacy Notice
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
