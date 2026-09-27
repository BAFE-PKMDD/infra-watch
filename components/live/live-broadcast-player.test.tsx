import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { LiveBroadcastPlayer } from "./live-broadcast-player";
import { LanguageProvider } from "@/providers/language-provider";
import type { PublicLiveVideo } from "@/types/live-video.types";

// LiveBroadcastPlayer reads its labels through useTranslation(), so render inside the
// app's LanguageProvider (which needs an app router); the language defaults to English.
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;
const render = (element: ReactElement) => renderToStaticMarkup(
  createElement(AppRouterContext.Provider, { value: router }, createElement(LanguageProvider, null, element)),
);

const video = {
  id: "4f12f3db-5e66-44dd-a7f3-89ea3af58fd1",
  title: "INFRA Watch field update",
  description: "A live project monitoring broadcast.",
  videoType: "facebook_live" as const,
  facebookVideoUrl: "https://www.facebook.com/DA.BAFE/videos/123456789/",
  isActive: true,
  isLive: true,
  publishedAt: new Date("2026-09-12T00:00:00.000Z"),
  expiresAt: null,
  createdBy: "admin-1",
  createdAt: new Date("2026-09-12T00:00:00.000Z"),
  updatedAt: new Date("2026-09-12T00:00:00.000Z"),
};

test("renders an embedded Facebook broadcast with a clear live status", () => {
  const html = render(createElement(LiveBroadcastPlayer, { video }));

  assert.match(html, /LIVE NOW/);
  assert.match(html, /INFRA Watch field update/);
  assert.match(html, /facebook\.com\/plugins\/video\.php/);
  assert.match(html, /allowFullScreen=""/);
  assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(html, /credentialless=""/);
});

test("renders a safe unavailable state when a stored URL is invalid", () => {
  const html = render(
    createElement(LiveBroadcastPlayer, {
      video: { ...video, facebookVideoUrl: "https://example.com/not-facebook" },
    }),
  );

  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /Broadcast unavailable/);
});

test("fails closed for recordings without files or unknown player types", () => {
  for (const videoType of ["recorded", "unexpected"] as const) {
    const html = render(createElement(LiveBroadcastPlayer, {
      video: { ...video, videoType } as unknown as PublicLiveVideo,
    }));
    assert.doesNotMatch(html, /<iframe/);
    assert.match(html, /Broadcast unavailable/);
  }
});

test("plays uploaded recordings without a live badge even with a stale live flag", () => {
  const html = render(createElement(LiveBroadcastPlayer, {
    video: { ...video, videoType: "recorded", videoPath: "videos/replay.mp4" },
  }));
  assert.match(html, /<video/);
  assert.match(html, /videos\/replay\.mp4/);
  assert.match(html, /controls=""/);
  assert.doesNotMatch(html, /LIVE NOW|<iframe/);
});

test("renders a privacy-enhanced YouTube broadcast", () => {
  const html = render(createElement(LiveBroadcastPlayer, {
    video: {
      ...video,
      videoType: "youtube",
      facebookVideoUrl: "https://youtu.be/dQw4w9WgXcQ",
    },
  }));

  assert.match(html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(html, /LIVE NOW/);
  assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(html, /credentialless=""/);
});
