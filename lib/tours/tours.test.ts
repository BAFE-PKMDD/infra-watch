import assert from "node:assert/strict";
import { test } from "bun:test";
import { FEATURE_TOURS, availableFeatureTours, overviewTour, pageTour, OVERVIEW_ID } from "./catalog";
import { applyTourUpdate, automaticTourId, EMPTY_TOUR_PROGRESS, tourKey, tourUpdateSchema } from "./progress";
import { tourPanelPosition } from "./position";

test("first login offers only the feature overview; page guides and lessons stay manual", () => {
  assert.equal(automaticTourId(EMPTY_TOUR_PROGRESS), OVERVIEW_ID);
  const welcomed = applyTourUpdate(EMPTY_TOUR_PROGRESS, { tourId: OVERVIEW_ID, outcome: "completed", disableAutomatic: false });
  assert.equal(automaticTourId(welcomed), null);
  const finished = applyTourUpdate(welcomed, { tourId: "dashboard", outcome: "completed", disableAutomatic: false });
  assert.equal(automaticTourId(finished), null);
  assert.deepEqual(EMPTY_TOUR_PROGRESS.seen, {});
});

test("skipping dismisses this tour, opt-out suppresses all automatic tours, replay can opt back in", () => {
  const skipped = applyTourUpdate(EMPTY_TOUR_PROGRESS, { tourId: OVERVIEW_ID, outcome: "skipped", disableAutomatic: true });
  assert.equal(skipped.seen[tourKey(OVERVIEW_ID)], "skipped");
  assert.equal(automaticTourId(skipped), null);
  const enabled = applyTourUpdate(skipped, { tourId: "projects", outcome: "completed", disableAutomatic: false });
  assert.equal(automaticTourId(enabled), null);
  assert.ok(pageTour("/admin-projects", { role: "admin" }), "manual replay remains available independently of progress");
});

test("tour progress is versioned and new accounts do not inherit another account's completion", () => {
  const old = { automatic: true, seen: { "v0:welcome": "completed" as const } };
  assert.equal(automaticTourId(old), OVERVIEW_ID);
  const first = applyTourUpdate(EMPTY_TOUR_PROGRESS, { tourId: OVERVIEW_ID, outcome: "completed", disableAutomatic: false });
  assert.equal(automaticTourId(first), null);
  assert.equal(automaticTourId(EMPTY_TOUR_PROGRESS), OVERVIEW_ID);
});

test("server input rejects unknown tours, invalid outcomes, and client-supplied user IDs", () => {
  const valid = { tourId: "dashboard", outcome: "completed", disableAutomatic: false };
  assert.equal(tourUpdateSchema.safeParse(valid).success, true);
  for (const invalid of [{ ...valid, userId: "another-user" }, { ...valid, tourId: "__proto__" }, { ...valid, outcome: "new" }, { ...valid, disableAutomatic: "false" }, null]) {
    assert.equal(tourUpdateSchema.safeParse(invalid).success, false);
  }
});

test("admin overview includes every supported main feature and every page has a completion step", () => {
  const tours = availableFeatureTours({ role: "admin" });
  assert.equal(tours.length, FEATURE_TOURS.length);
  assert.equal(new Set(tours.map((tour) => tour.id)).size, tours.length);
  const overview = overviewTour({ role: "admin" });
  for (const feature of tours) {
    assert.ok(overview.steps.some((step) => step.title === feature.title));
    const guide = pageTour(feature.path, { role: "admin" });
    assert.ok(guide && guide.steps.length >= 4);
    assert.equal(guide.steps.at(-1)?.title, "Tour complete");
  }
});

test("regional admin tours omit instance-wide administrative tools", () => {
  const ids = availableFeatureTours({ role: "regional_admin" }).map((tour) => tour.id);
  for (const id of ["sync", "quality", "audit", "knowledge"]) assert.equal(ids.includes(id), false);
  for (const id of ["users", "videos", "settings", "reports-issues"]) assert.equal(ids.includes(id), true);
});

test("moderator tours honor assigned analytics scope and never expose privileged features", () => {
  const unscoped = availableFeatureTours({ role: "moderator" }).map((tour) => tour.id);
  assert.deepEqual(unscoped, ["projects", "feedback", "issues", "messages"]);
  const scoped = availableFeatureTours({ role: "moderator", region: "Region I" }).map((tour) => tour.id);
  assert.ok(scoped.includes("dashboard"));
  assert.ok(scoped.includes("executive-brief"));
  assert.equal(scoped.includes("reports-issues"), false);
  assert.equal(pageTour("/sync", { role: "moderator" }), null);
  for (const role of ["citizen", "unknown", null]) assert.deepEqual(availableFeatureTours({ role }), []);
});

test("detail and edit pages receive their own guide, independently of each record ID", () => {
  assert.equal(pageTour("/issues/example", { role: "admin" })?.id, "issue-detail");
  assert.equal(pageTour("/issues/another-record", { role: "admin" })?.id, "issue-detail");
  assert.equal(pageTour("/live-videos/new", { role: "admin" })?.id, "video-create");
  assert.equal(pageTour("/live-videos/example", { role: "admin" })?.id, "video-edit");
  assert.equal(pageTour("/live-videos/new", { role: "moderator" }), null);
  assert.equal(pageTour("/issues/sms-review", { role: "admin" }), null);
  assert.equal(pageTour("/dashboard-other", { role: "admin" }), null);
});

test("popover positions fit desktop, mobile, landscape, zoomed, and missing-target layouts", () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }, { width: 320, height: 568 }, { width: 667, height: 320 }, { width: 768, height: 1024 }]) {
    for (const target of [null, { left: 10, top: 90, width: 240, height: 44 }, { left: 20, top: 500, width: 1000, height: 600 }]) {
      const position = tourPanelPosition(target, viewport, { width: 440, height: 420 });
      assert.ok(position.left >= 16 && position.top >= 16);
      assert.ok(position.left + Math.min(440, viewport.width - 32) <= viewport.width - 16);
      assert.ok(position.top + Math.min(420, viewport.height - 32) <= viewport.height - 16);
    }
  }
  assert.equal(tourPanelPosition({ left: 10, top: 90, width: 240, height: 44 }, { width: 1440, height: 900 }, { width: 440, height: 420 }).left, 266);
});
