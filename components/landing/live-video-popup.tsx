"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Radio, X } from "lucide-react";

import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";
import { Button } from "@/components/ui/button";
import type { PublicLiveVideo } from "@/types/live-video.types";

export function LiveVideoPopup({ video }: { video: PublicLiveVideo | null }) {
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const [minimizedVideoId, setMinimizedVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!video) return;
    const wasDismissed = sessionStorage.getItem("infra-watch-dismissed-live-video") === video.id;
    const timer = window.setTimeout(() => {
      if (wasDismissed) {
        setMinimizedVideoId(video.id);
      } else {
        setVisibleVideoId(video.id);
      }
    }, wasDismissed ? 0 : 1_500);
    return () => window.clearTimeout(timer);
  }, [video]);

  const dismiss = () => {
    if (!video) return;
    sessionStorage.setItem("infra-watch-dismissed-live-video", video.id);
    setVisibleVideoId(null);
    setMinimizedVideoId(video.id);
  };

  const reopen = () => {
    if (!video) return;
    setMinimizedVideoId(null);
    setVisibleVideoId(video.id);
  };

  if (!video) return null;

  if (minimizedVideoId === video.id) {
    return (
      <Button
        type="button"
        onClick={reopen}
        aria-label={`Reopen live broadcast: ${video.title}`}
        className="fixed bottom-20 right-4 z-50 h-11 gap-2 rounded-full bg-red-600 px-4 font-bold text-white shadow-xl ring-2 ring-white/90 hover:bg-red-700 sm:right-6"
      >
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        <Radio className="size-4" aria-hidden="true" />
        Watch live
      </Button>
    );
  }

  if (visibleVideoId !== video.id) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 ml-auto max-h-[calc(100vh-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-slate-950 dark:ring-white/10 sm:bottom-6 sm:right-6" role="dialog" aria-modal="false" aria-label="Live broadcast">
      <button type="button" onClick={dismiss} className="absolute right-3 top-3 z-10 rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black" aria-label="Dismiss live broadcast">
        <X className="size-4" />
      </button>
      <LiveBroadcastPlayer video={video} />
      <div className="flex gap-2 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <Button nativeButton={false} render={<Link href="/live" />} className="flex-1 bg-red-600 text-white hover:bg-red-700">Open Live page</Button>
        <Button type="button" variant="outline" onClick={dismiss}>Not now</Button>
      </div>
    </div>
  );
}
