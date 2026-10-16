"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Wrench } from "lucide-react";

import { useTranslation } from "@/i18n";
import { SITE_NOTICES_QUERY_KEY } from "@/lib/site-notices";

/**
 * Full-page notice shown to visitors and citizens while maintenance mode is on.
 * It cannot be dismissed: Escape and outside clicks are ignored on purpose.
 * This only covers the page for people; it does not stop API requests.
 */
export function MaintenanceNotice() {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // When maintenance has ended, the refetch flips the flag and the gate unmounts this notice.
  const checkAgain = async () => {
    setIsChecking(true);
    try {
      await queryClient.refetchQueries({ queryKey: SITE_NOTICES_QUERY_KEY });
    } finally {
      setLastChecked(new Date());
      setIsChecking(false);
    }
  };

  const lastCheckedLabel = lastChecked
    ? new Intl.DateTimeFormat(language === "tl" ? "fil-PH" : "en-PH", {
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }).format(lastChecked)
    : null;

  return (
    <DialogPrimitive.Root open modal onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[100] bg-slate-950/95" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-[101] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-white text-center shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700 sm:px-8">
            <div className="flex items-center justify-center gap-3">
              <Image
                src="/infra-watch-logo.png"
                alt=""
                width={96}
                height={64}
                className="h-10 w-auto object-contain"
                unoptimized
              />
              <div className="text-left">
                <p className="text-lg font-extrabold leading-none text-slate-900 dark:text-white">INFRA WATCH</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {t("site.maintenance.portalName")}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <Wrench className="size-3.5" aria-hidden="true" />
              {t("site.maintenance.status")}
            </p>

            <DialogPrimitive.Title className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
              {t("site.maintenance.title")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {t("site.maintenance.body")}
            </DialogPrimitive.Description>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={checkAgain}
                disabled={isChecking}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-wait disabled:opacity-80"
              >
                {isChecking ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <RefreshCw className="size-4" aria-hidden="true" />
                )}
                {isChecking ? t("site.maintenance.checking") : t("site.maintenance.checkAgain")}
              </button>
              <Link
                href="/sign-in"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t("site.maintenance.staffSignIn")}
              </Link>
            </div>

            <p className="mt-4 min-h-5 text-sm text-slate-600 dark:text-slate-400" role="status" aria-live="polite">
              {lastCheckedLabel ? t("site.maintenance.stillDown", { time: lastCheckedLabel }) : ""}
            </p>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
