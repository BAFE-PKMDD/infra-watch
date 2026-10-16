"use client";

import { useSyncExternalStore } from "react";

import { useTranslation } from "@/i18n";
import { BannerBar } from "./banner-bar";
import { useSiteNotices } from "./use-site-notices";

const DISMISSED_STORAGE_KEY = "site-banner-dismissed";
const DISMISSED_EVENT = "infrawatch:site-banner-dismissed";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DISMISSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DISMISSED_EVENT, onStoreChange);
  };
}

function getDismissedMessage() {
  try {
    return sessionStorage.getItem(DISMISSED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerDismissedMessage() {
  return null;
}

/**
 * The admin-configured banner at the top of the public pages. A visitor can dismiss it for the
 * rest of the browser session; changing the message brings it back.
 */
export function PublicBanner() {
  const { t } = useTranslation();
  const { banner } = useSiteNotices();
  const dismissedMessage = useSyncExternalStore(subscribe, getDismissedMessage, getServerDismissedMessage);

  if (!banner || dismissedMessage === banner.message) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_STORAGE_KEY, banner.message);
      window.dispatchEvent(new Event(DISMISSED_EVENT));
    } catch {
      // Storage unavailable (private mode): the banner just stays until the next page load.
    }
  };

  return (
    <BannerBar
      message={banner.message}
      backgroundColor={banner.backgroundColor}
      textColor={banner.textColor}
      label={t("site.banner.label")}
      onDismiss={dismiss}
      dismissLabel={t("site.banner.dismiss")}
    />
  );
}
