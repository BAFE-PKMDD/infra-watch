import assert from "node:assert/strict";
import test from "node:test";

import {
  formatLiveVideoDateInput,
  parseLiveVideoDateInput,
  validateLiveVideoActivation,
  validateLiveVideoSchedule,
  validateLiveVideoState,
} from "./live-video-input";

const now = new Date("2026-09-12T01:00:00.000Z");

test("rejects activation of expired external broadcasts with instructions to fix the expiry", () => {
  for (const expiresAt of [new Date("2026-09-11T15:59:59.999Z"), now]) {
    assert.throws(
      () => validateLiveVideoActivation({ isActive: true, expiresAt, videoType: "youtube" }, now),
      /extend or clear its expiry date/,
    );
  }
});

test("allows activation after clearing or extending expiry and allows deactivation", () => {
  for (const expiresAt of [null, new Date("2026-09-12T15:59:59.999Z")]) {
    assert.doesNotThrow(() => validateLiveVideoActivation({ isActive: true, expiresAt, videoType: "facebook_live" }, now));
  }
  assert.doesNotThrow(() => validateLiveVideoActivation({
    isActive: false,
    videoType: "youtube",
    expiresAt: new Date("2026-09-11T15:59:59.999Z"),
  }, now));
});

test("allows recorded videos to activate despite legacy expiry dates", () => {
  for (const expiresAt of [new Date("2026-09-11T15:59:59.999Z"), now, null]) {
    assert.doesNotThrow(() => validateLiveVideoActivation({
      isActive: true,
      videoType: "recorded",
      expiresAt,
    }, now));
  }
});

test("allows a current live broadcast inside its publication window", () => {
  assert.doesNotThrow(() => validateLiveVideoSchedule({
    isLive: true,
    publishedAt: new Date("2026-09-12T00:00:00.000Z"),
    expiresAt: new Date("2026-09-12T02:00:00.000Z"),
  }, now));
});

test("treats a selected expiry date as inclusive through the end of the Philippine day", () => {
  const publishedAt = parseLiveVideoDateInput("2026-09-15", "start");
  const expiresAt = parseLiveVideoDateInput("2026-09-16", "end");

  assert.equal(publishedAt?.toISOString(), "2026-09-14T16:00:00.000Z");
  assert.equal(expiresAt?.toISOString(), "2026-09-16T15:59:59.999Z");
  assert.equal(formatLiveVideoDateInput(publishedAt), "2026-09-15");
  assert.equal(formatLiveVideoDateInput(expiresAt), "2026-09-16");
  assert.doesNotThrow(() => validateLiveVideoSchedule({
    isLive: true,
    publishedAt,
    expiresAt,
  }, new Date("2026-09-16T05:00:00.000Z")));
});

test("rejects the broadcast after the selected Philippine expiry date has ended", () => {
  assert.throws(
    () => validateLiveVideoSchedule({
      isLive: true,
      publishedAt: null,
      expiresAt: parseLiveVideoDateInput("2026-09-16", "end"),
    }, new Date("2026-09-16T16:00:00.000Z")),
    /expired/,
  );
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
