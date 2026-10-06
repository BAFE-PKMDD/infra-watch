"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The queue is rendered on the server, so a page left open would never show a text that
// arrived after it loaded. Re-fetches it every minute, only while the tab is being looked at.
export function SmsQueueAutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
