"use client";

import { useState } from "react";

import type { PublicPhoto } from "@/lib/public-analytics/rules";
import { format } from "@/lib/public-analytics/strings";
import { cn } from "@/lib/utils";

import { usePublicAnalyticsStrings } from "../use-strings";

export function PhotoGallery({ photos, projectName }: { photos: PublicPhoto[]; projectName: string }) {
  const t = usePublicAnalyticsStrings();
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return <p className="rounded-md border border-pa-hair bg-pa-surface-2 p-6 text-base text-pa-ink-2">{t.project.noPhotos}</p>;
  }
  const current = photos[Math.min(index, photos.length - 1)];
  const alt = (photo: PublicPhoto, position: number) =>
    `${format(t.map.photoAlt, { name: projectName })} (${format(t.project.photoPosition, { category: t.project.photoCategory[photo.category], position, total: photos.length })})`;

  return (
    <div>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- source photos come from several external hosts */}
        <img src={current.url} alt={alt(current, index + 1)} className="aspect-[4/3] w-full rounded-md bg-pa-surface-2 object-cover sm:aspect-[16/9]" />
        <figcaption className="mt-1 text-sm text-pa-ink-2">{t.project.photoCategory[current.category]}</figcaption>
      </figure>
      {photos.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, position) => (
            <li key={photo.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={alt(photo, position + 1)}
                aria-pressed={position === index}
                className={cn("block size-16 overflow-hidden rounded border-2", position === index ? "border-pa-accent" : "border-transparent")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of external source photos */}
                <img src={photo.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
