"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Radio } from "lucide-react";

import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";
import { cn } from "@/lib/utils";
import type { PublicLiveVideo } from "@/types/live-video.types";

export function LiveBroadcastsClient({ videos }: { videos: PublicLiveVideo[] }) {
  const defaultVideo = useMemo(() => videos.find((video) => video.isLive) ?? videos[0], [videos]);
  const [selectedId, setSelectedId] = useState(defaultVideo?.id);
  const selected = videos.find((video) => video.id === selectedId) ?? defaultVideo;

  if (!selected) {
    return (
      <div className="border-y border-slate-200 bg-white px-5 py-16 text-center dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl sm:border">
        <Radio className="mx-auto size-10 text-slate-400" aria-hidden />
        <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">No broadcasts available</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Published livestreams and replays will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <LiveBroadcastPlayer video={selected} />
      <section aria-labelledby="broadcast-list-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <h2 id="broadcast-list-title" className="text-xl font-extrabold text-slate-950 dark:text-white">Broadcasts</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Select a broadcast to watch it in the player.</p>
          </div>
          <span className="text-sm font-bold text-slate-500">{videos.length}</span>
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden border-y border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950 sm:rounded-xl sm:border">
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => {
                setSelectedId(video.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(
                "flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900",
                selected.id === video.id && "bg-primary/5",
              )}
              aria-pressed={selected.id === video.id}
            >
              <span className={cn("mt-1 size-2.5 shrink-0 rounded-full bg-slate-300", video.isLive && "animate-pulse bg-red-600")} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-950 dark:text-white">{video.title}</span>
                {video.description && <span className="mt-1 block line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{video.description}</span>}
                <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : "Available now"}
                </span>
              </span>
              {video.isLive && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-700 dark:bg-red-950/40 dark:text-red-300">LIVE</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
