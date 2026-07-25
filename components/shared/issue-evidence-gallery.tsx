"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MapPin, Play } from "lucide-react";

import { MediaViewer } from "@/components/ui/media-viewer";
import { getFullUrl, isLocalMinIO } from "@/lib/minio-url";
import type { StoredIssueEvidenceItem } from "@/types/geo-evidence.types";

type IssueEvidenceGalleryProps = {
  evidence?: StoredIssueEvidenceItem[] | null;
  photoUrls?: string[];
  videoUrls?: string[];
  emptyLabel?: string;
};

export function IssueEvidenceGallery({
  evidence,
  photoUrls = [],
  videoUrls = [],
  emptyLabel = "No evidence files attached",
}: IssueEvidenceGalleryProps) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const media = useMemo<Array<StoredIssueEvidenceItem & { type: "image" | "video"; evidenceIndex: number }>>(() => {
    const stored = (evidence ?? []).flatMap((item, evidenceIndex) => (
      item.type === "image" || item.type === "video"
        ? [{ ...item, type: item.type, evidenceIndex }]
        : []
    ));
    if (stored.length > 0) return stored;

    return [
      ...photoUrls.map((url, evidenceIndex) => ({ type: "image" as const, url, evidenceIndex })),
      ...videoUrls.map((url, index) => ({
        type: "video" as const,
        url,
        evidenceIndex: photoUrls.length + index,
      })),
    ];
  }, [evidence, photoUrls, videoUrls]);

  if (media.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
        {emptyLabel}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {media.map((item, index) => {
          const src = getFullUrl(item.url) || item.url;
          const hasCoordinates = typeof item.lat === "number" && typeof item.lon === "number";

          return (
            <article
              id={`evidence-${item.evidenceIndex}`}
              key={`${item.url}-${item.evidenceIndex}`}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-shadow dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-950">
                {item.type === "image" ? (
                  <button type="button" onClick={() => setViewingIndex(index)} className="relative h-full w-full">
                    <Image
                      src={src || "/placeholder-image.jpg"}
                      alt={item.name || `Evidence ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized={isLocalMinIO(src)}
                    />
                  </button>
                ) : (
                  <video src={src} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                )}
                {item.type === "video" ? (
                  <span className="pointer-events-none absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-slate-950/75 text-white backdrop-blur">
                    <Play className="size-3.5 fill-current" />
                  </span>
                ) : null}
              </div>
              <div className="flex min-h-12 items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.name || `${item.type === "video" ? "Video" : "Photo"} evidence ${index + 1}`}
                </span>
                {hasCoordinates ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300" title={`${item.lat}, ${item.lon}`}>
                    <MapPin className="size-3" />
                    {item.lat?.toFixed(4)}, {item.lon?.toFixed(4)}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">No GPS</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <MediaViewer
        media={media.map(({ type, url }) => ({ type, url }))}
        initialIndex={viewingIndex ?? 0}
        open={viewingIndex !== null}
        onClose={() => setViewingIndex(null)}
      />
    </>
  );
}
