import assert from "node:assert/strict";
import test from "node:test";

import { validateLiveVideoSchedule, validateLiveVideoState } from "./live-video-input";

const now = new Date("2026-09-12T01:00:00.000Z");

test("allows a current live broadcast inside its publication window", () => {
  assert.doesNotThrow(() => validateLiveVideoSchedule({
    isLive: true,
    publishedAt: new Date("2026-09-12T00:00:00.000Z"),
    expiresAt: new Date("2026-09-12T02:00:00.000Z"),
  }, now));
});

test("rejects marking future or expired broadcasts as currently live", () => {
  assert.throws(
    () => validateLiveVideoSchedule({ isLive: true, publishedAt: new Date("2026-09-12T02:00:00.000Z"), expiresAt: null }, now),
    /not started/,
  );
  assert.throws(
    () => validateLiveVideoSchedule({ isLive: true, publishedAt: null, expiresAt: new Date("2026-09-12T01:00:00.000Z") }, now),
    /expired/,
  );
});

test("allows inactive scheduling when the entry is not marked currently live", () => {
  assert.doesNotThrow(() => validateLiveVideoSchedule({
    isLive: false,
    publishedAt: new Date("2026-09-13T00:00:00.000Z"),
    expiresAt: new Date("2026-09-14T00:00:00.000Z"),
  }, now));
});

test("requires a currently live video to be active and externally hosted", () => {
  assert.doesNotThrow(() => validateLiveVideoState({
    isActive: true,
    isLive: true,
    videoType: "youtube",
  }));

  assert.throws(
    () => validateLiveVideoState({ isActive: false, isLive: true, videoType: "youtube" }),
    /active/i,
  );
  assert.throws(
    () => validateLiveVideoState({ isActive: true, isLive: true, videoType: "recorded" }),
    /recorded/i,
  );
});
