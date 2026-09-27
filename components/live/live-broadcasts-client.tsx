"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CalendarDays, Play, Search, Video, X } from "lucide-react";

import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";
import { useTranslation } from "@/i18n";
import { getFullUrl } from "@/lib/minio-url";
import { getYouTubeVideoId } from "@/lib/video-utils";
import { PHILIPPINE_REGION_BY_CODE, type RegionCode } from "@/lib/philippines-regions";
import type { PublicLiveVideo } from "@/types/live-video.types";

function VideoThumbnail({ src }: { src: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <Video className="size-10 text-slate-500" aria-hidden />;
  return <Image src={src} alt="" fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" onError={() => setFailedSrc(src)} />;
}

export function LiveBroadcastsClient({ videos }: { videos: PublicLiveVideo[] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const liveVideo = videos.find((video) => video.isLive && video.videoType !== "recorded");
  const selected = videos.find((video) => video.id === selectedId) ?? liveVideo;
  const query = search.trim().toLowerCase();
  const pastVideos = videos.filter((video) => (!video.isLive || video.videoType === "recorded") &&
    `${video.title} ${video.description ?? ""}`.toLowerCase().includes(query));

  function selectVideo(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      playerRef.current?.focus({ preventScroll: true });
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{t("site.live.title")}</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600 dark:text-slate-300">{t("site.live.subtitle")}</p>
        </div>
        <div className="relative w-full lg:w-96 lg:shrink-0">
          <label htmlFor="broadcast-search" className="sr-only">{t("site.live.searchLabel")}</label>
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" aria-hidden />
          <input id="broadcast-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("site.live.searchPlaceholder")} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-offset-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-950" />
        </div>
      </div>

      {selected && (
        <div ref={playerRef} tabIndex={-1} className="scroll-mt-24 space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">{selected.isLive && selected.videoType !== "recorded" ? t("site.live.currentlyLive") : t("site.live.pastVideo")}</h2>
            {selectedId && <button type="button" onClick={() => setSelectedId(null)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"><X className="size-4" aria-hidden />{liveVideo ? t("site.live.returnToLive") : t("site.live.closePlayer")}</button>}
          </div>
          <LiveBroadcastPlayer video={selected} />
        </div>
      )}

      <section aria-labelledby="past-videos-title" className="space-y-6">
        <div className="flex items-baseline gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <h2 id="past-videos-title" className="text-xl font-extrabold text-slate-950 dark:text-white">{t("site.live.pastVideos")}</h2>
          <span role="status" className="text-sm text-slate-600 dark:text-slate-300">{t(pastVideos.length === 1 ? "site.live.videoCount.one" : "site.live.videoCount.other", { count: pastVideos.length })}</span>
        </div>
        {pastVideos.length === 0 ? (
          <p className="py-12 text-center text-slate-600 dark:text-slate-300">{query ? t("site.live.noMatches") : t("site.live.noPastVideos")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pastVideos.map((video) => {
              const youtubeId = video.videoType === "youtube" ? getYouTubeVideoId(video.facebookVideoUrl) : null;
              const thumbnail = getFullUrl(video.thumbnailPath) ?? (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null);
              const region = video.region ? PHILIPPINE_REGION_BY_CODE.get(video.region as RegionCode)?.shortLabel ?? video.region : null;
              return (
                <button key={video.id} type="button" onClick={() => selectVideo(video.id)} aria-label={t("site.live.watch", { title: video.title })} aria-pressed={selectedId === video.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-950">
                  <span className="relative flex aspect-video items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <VideoThumbnail src={thumbnail} />
                    <span className="absolute flex size-11 items-center justify-center rounded-full bg-black/65 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"><Play className="size-5" aria-hidden /></span>
                  </span>
                  <span className="flex flex-col gap-2 p-4">
                    <span className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-950 dark:text-white">{video.title}</span>
                    {video.description && <span className="line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{video.description}</span>}
                    <span className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><CalendarDays className="size-3.5" aria-hidden />{video.videoType === "recorded" ? t("site.live.recorded") : t("site.live.replay")}{region && <span>· {region}</span>}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
