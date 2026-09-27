import { Radio } from "lucide-react";

import { getVideoEmbedUrl } from "@/lib/video-utils";
import { getFullUrl } from "@/lib/minio-url";
import type { PublicLiveVideo } from "@/types/live-video.types";

export function LiveBroadcastPlayer({ video }: { video: PublicLiveVideo }) {
  const recordedUrl = video.videoType === "recorded" ? getFullUrl(video.videoPath) : null;
  const externalType = video.videoType === "facebook_live" || video.videoType === "youtube"
    ? video.videoType
    : null;
  const embedUrl = externalType
    ? getVideoEmbedUrl(externalType, video.facebookVideoUrl)
    : null;

  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl sm:border">
      <div className="relative aspect-video bg-slate-950">
        {recordedUrl ? (
          <video key={video.id} src={recordedUrl} controls playsInline preload="metadata" aria-label={video.title} className="h-full w-full" />
        ) : embedUrl ? (
          <iframe
            {...({ credentialless: "" } as Record<string, string>)}
            src={embedUrl}
            title={video.title}
            className="h-full w-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <Radio className="size-10 text-slate-400" aria-hidden />
            <p className="font-bold">Broadcast unavailable</p>
            <p className="max-w-md text-sm text-slate-400">The saved video link cannot be embedded.</p>
          </div>
        )}
        {video.isLive && externalType && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            LIVE NOW
          </div>
        )}
      </div>
      <div className="space-y-2 px-4 py-5 sm:px-6">
        <h1 className="text-xl font-extrabold text-slate-950 dark:text-white sm:text-2xl">{video.title}</h1>
        {video.description && <p className="max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">{video.description}</p>}
      </div>
    </section>
  );
}
