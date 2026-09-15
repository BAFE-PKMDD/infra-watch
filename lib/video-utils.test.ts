import assert from "node:assert/strict";
import test from "node:test";

import {
  getFacebookEmbedUrl,
  getVideoEmbedUrl,
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  normalizeFacebookVideoUrl,
  normalizeYouTubeVideoUrl,
} from "./video-utils";

test("normalizes supported Facebook video and live URLs", () => {
  assert.equal(
    normalizeFacebookVideoUrl("https://www.facebook.com/DA.BAFE/videos/123456789/?mibextid=test"),
    "https://www.facebook.com/DA.BAFE/videos/123456789/?mibextid=test",
  );
  assert.equal(
    normalizeFacebookVideoUrl("https://fb.watch/abc-123/"),
    "https://fb.watch/abc-123/",
  );
});

test("rejects non-Facebook, insecure, credentialed, malformed, and non-video URLs", () => {
  for (const url of [
    "https://example.com/video/123",
    "https://facebook.com.evil.example/video/123",
    "http://www.facebook.com/watch/?v=123",
    "https://user:password@www.facebook.com/watch/?v=123",
    "https://www.facebook.com/login/",
    "https://facebook.com/",
    "https://www.facebook.com/settings",
    "https://www.facebook.com/help/videos/foo",
    "https://www.facebook.com/watch/?v=not-a-video",
    "https://fb.watch/privacy",
    "https://fb.watch/",
    "not a url",
  ]) {
    assert.equal(normalizeFacebookVideoUrl(url), null, url);
  }
});

test("accepts Facebook watch and shared-video permalinks", () => {
  assert.equal(
    normalizeFacebookVideoUrl("https://www.facebook.com/watch/?v=123456789"),
    "https://www.facebook.com/watch/?v=123456789",
  );
  assert.equal(
    normalizeFacebookVideoUrl("https://www.facebook.com/share/v/abc123/"),
    "https://www.facebook.com/share/v/abc123/",
  );
});

test("builds the Facebook plugin URL without accepting a prebuilt iframe source", () => {
  const source = "https://www.facebook.com/DA.BAFE/videos/123456789/";
  const embed = getFacebookEmbedUrl(source);

  assert.equal(
    embed,
    `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(source)}&show_text=false&width=1280`,
  );
  assert.equal(
    getFacebookEmbedUrl("https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fevil.example"),
    null,
  );
});

test("extracts YouTube IDs from supported watch, share, Shorts, live, and embed URLs", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=12",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ]) {
    assert.equal(getYouTubeVideoId(url), "dQw4w9WgXcQ", url);
  }
});

test("rejects malformed, insecure, credentialed, and lookalike YouTube URLs", () => {
  for (const url of [
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://user:password@www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=too-short",
    "https://youtu.be/",
    "not a url",
  ]) {
    assert.equal(normalizeYouTubeVideoUrl(url), null, url);
  }
});

test("normalizes YouTube URLs and builds privacy-enhanced embeds", () => {
  assert.equal(
    normalizeYouTubeVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=12"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assert.equal(
    getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
  );
  assert.equal(
    getVideoEmbedUrl("youtube", "https://youtu.be/dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
  );
});
