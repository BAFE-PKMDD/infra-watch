import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { LiveBroadcastsClient } from "./live-broadcasts-client";
import { LanguageProvider } from "@/providers/language-provider";
import type { PublicLiveVideo } from "@/types/live-video.types";

// LiveBroadcastsClient reads its labels through useTranslation(), so render inside the
// app's LanguageProvider (which needs an app router); the language defaults to English.
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;
const render = (element: ReactElement) => renderToStaticMarkup(
  createElement(AppRouterContext.Provider, { value: router }, createElement(LanguageProvider, null, element)),
);

const recording: PublicLiveVideo = {
  id: "recording",
  title: "Past field visit",
  description: null,
  videoType: "recorded",
  videoPath: "videos/replay.mp4",
  facebookVideoUrl: null,
  isActive: true,
  isLive: true,
  publishedAt: null,
  expiresAt: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

test("lists recordings as past videos despite stale expiry and live fields", () => {
  const html = render(createElement(LiveBroadcastsClient, { videos: [recording] }));
  assert.match(html, /Past videos/);
  assert.doesNotMatch(html, /<video|<iframe/);
  assert.match(html, /Watch Past field visit/);
  assert.match(html, /broadcast-search/);
  assert.doesNotMatch(html, /Currently live|LIVE NOW|>LIVE</);
});

test("shows thumbnails and region labels on the past-video grid", () => {
  const html = render(createElement(LiveBroadcastsClient, {
    videos: [{ ...recording, thumbnailPath: "videos/thumbnail.jpg", region: "R8" }],
  }));
  assert.match(html, /videos\/thumbnail\.jpg/);
  assert.match(html, /Region VIII/);
  assert.match(html, /lg:grid-cols-4/);
});

test("separates live broadcasts from recordings and selects the live broadcast first", () => {
  const html = render(createElement(LiveBroadcastsClient, {
    videos: [recording, {
      ...recording, id: "broadcast", title: "Current broadcast", videoType: "youtube",
      facebookVideoUrl: "https://youtu.be/dQw4w9WgXcQ", expiresAt: null,
    }],
  }));
  assert.match(html, /Currently live/);
  assert.match(html, /Past videos/);
  assert.match(html, /LIVE NOW/);
  assert.match(html, /<iframe/);
  assert.doesNotMatch(html, /<video/);
});

test("shows every simultaneous live broadcast and keeps recordings in the past grid", () => {
  const broadcast = {
    ...recording, id: "broadcast-a", title: "Opening of bids A", videoType: "youtube",
    facebookVideoUrl: "https://youtu.be/dQw4w9WgXcQ", expiresAt: null,
  } satisfies PublicLiveVideo;
  const html = render(createElement(LiveBroadcastsClient, {
    videos: [recording, broadcast, { ...broadcast, id: "broadcast-b", title: "Opening of bids B" }],
  }));
  assert.equal(html.match(/<iframe/g)?.length, 2);
  assert.match(html, /Opening of bids A/);
  assert.match(html, /Opening of bids B/);
  assert.equal(html.match(/Currently live/g)?.length, 1);
  assert.match(html, /lg:grid-cols-2/);
  assert.match(html, /Watch Past field visit/);
  assert.doesNotMatch(html, /Watch Opening of bids/);
});
