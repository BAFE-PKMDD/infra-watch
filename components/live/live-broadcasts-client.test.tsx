import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveBroadcastsClient } from "./live-broadcasts-client";
import type { PublicLiveVideo } from "@/types/live-video.types";

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
  const html = renderToStaticMarkup(createElement(LiveBroadcastsClient, { videos: [recording] }));
  assert.match(html, /Past videos/);
  assert.doesNotMatch(html, /<video|<iframe/);
  assert.match(html, /Watch Past field visit/);
  assert.match(html, /broadcast-search/);
  assert.doesNotMatch(html, /Currently live|LIVE NOW|>LIVE</);
});

test("shows thumbnails and region labels on the past-video grid", () => {
  const html = renderToStaticMarkup(createElement(LiveBroadcastsClient, {
    videos: [{ ...recording, thumbnailPath: "videos/thumbnail.jpg", region: "R8" }],
  }));
  assert.match(html, /videos\/thumbnail\.jpg/);
  assert.match(html, /Region VIII/);
  assert.match(html, /lg:grid-cols-4/);
});

test("separates live broadcasts from recordings and selects the live broadcast first", () => {
  const html = renderToStaticMarkup(createElement(LiveBroadcastsClient, {
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
