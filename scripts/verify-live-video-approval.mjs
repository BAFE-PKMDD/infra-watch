// Run in an isolated process: bun scripts/verify-live-video-approval.mjs
import assert from "node:assert/strict";
import { mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let user = { id: "regional", role: "regional_admin", region: "R8" };
let current;
const writes = [];
const tx = {
  select() {
    const query = {
      from: () => query,
      where: () => query,
      limit: () => query,
      for: async () => current ? [current] : [],
      then: (resolve) => resolve(current ? [current] : []),
    };
    return query;
  },
  insert() {
    return { values: (values) => ({ returning: async () => {
      current = { id: "video", ...values };
      writes.push(values);
      return [current];
    } }) };
  },
  update() {
    return { set: (values) => ({ where: async () => {
      const defined = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
      writes.push(defined);
      current = { ...current, ...defined };
    } }) };
  },
  delete() { return { where: async () => { current = undefined; } }; },
};
mock.module("@/lib/session", () => ({ requireAdminOrRegionalAdmin: async () => user }));
mock.module("next/cache", () => ({ revalidatePath() {} }));
mock.module("next/navigation", () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
mock.module("@/lib/db", () => ({ db: { ...tx, transaction: async (callback) => callback(tx) } }));
const actions = await import("../actions/mutation/live-videos.mutation.ts");
const originalError = console.error;
console.error = () => {};
try {
  const created = await actions.createLiveVideo({
    title: "Regional request", region: "NCR", videoType: "youtube",
    facebookVideoUrl: "https://youtu.be/dQw4w9WgXcQ", isActive: true, isLive: true, isFeatured: true,
  });
  assert.equal(created.success, true);
  assert.equal(current.region, "R8");
  assert.equal(current.approvalStatus, "pending");
  assert.equal(current.isActive, false);
  assert.equal(current.isLive, false);
  assert.equal(current.isFeatured, false);
  assert.equal(writes.length, 1, "regional requests must not displace a featured or live video");
  assert.equal((await actions.reviewLiveVideo("video", "approved")).success, false);
  assert.equal((await actions.toggleLiveVideoActive("video")).success, false);
  assert.equal((await actions.toggleLiveVideoLive("video")).success, false);

  user = { id: "other-regional", role: "admin", region: "R8" };
  assert.equal((await actions.updateLiveVideo("video", { title: "Unauthorized edit" })).success, false);
  assert.equal((await actions.deleteLiveVideo("video")).success, false);

  user = { id: "ncr", role: "admin", region: "NCR" };
  assert.equal((await actions.toggleLiveVideoActive("video")).success, false);
  assert.equal((await actions.updateLiveVideo("video", { isActive: true })).success, false);
  assert.equal((await actions.reviewLiveVideo("video", "approved")).success, true);
  assert.equal(current.reviewedBy, "ncr");
  assert.ok(current.reviewedAt instanceof Date);
  assert.equal(current.isActive, false);
  assert.equal((await actions.reviewLiveVideo("video", "rejected")).success, false);
  assert.equal((await actions.toggleLiveVideoActive("video")).success, true);
  assert.equal((await actions.toggleLiveVideoLive("video")).success, true);

  user = { id: "regional", role: "regional_admin", region: "R8" };
  assert.equal((await actions.updateLiveVideo("video", { title: "Revised request", isActive: true, isLive: true })).success, true);
  assert.equal(current.approvalStatus, "pending");
  assert.equal(current.isActive, false);
  assert.equal(current.isLive, false);
  assert.equal(current.reviewedBy, null);

  user = { id: "ncr", role: "admin", region: "NCR" };
  assert.equal((await actions.reviewLiveVideo("video", "rejected")).success, true);
  assert.equal((await actions.toggleLiveVideoActive("video")).success, false);
  user = { id: "regional", role: "regional_admin", region: "R8" };
  assert.equal((await actions.updateLiveVideo("video", { title: "Resubmitted request" })).success, true);
  assert.equal(current.approvalStatus, "pending");
  const { LiveVideoTable } = await import("../components/admin/live-videos/live-video-table.tsx");
  const { LiveVideoForm } = await import("../components/admin/live-videos/live-video-form.tsx");
  const regionalForm = renderToStaticMarkup(createElement(LiveVideoForm, { userRegion: "R8", canReview: false }));
  assert.match(regionalForm, /Submit for NCR approval/);
  assert.match(regionalForm, /NCR approval is required before publication/);
  assert.doesNotMatch(regionalForm, /bg-amber|border-amber/);
  const ncrForm = renderToStaticMarkup(createElement(LiveVideoForm, { userRegion: "NCR", canReview: true }));
  assert.doesNotMatch(ncrForm, /NCR approval is required|Submit this video for NCR approval|request is pending approval/);
  assert.match(ncrForm, /Create Video/);
  assert.equal((regionalForm.match(/role="switch"[^>]*disabled=""/g) ?? []).length, 3);
  const regionalTable = renderToStaticMarkup(createElement(LiveVideoTable, { videos: [current], canReview: false }));
  assert.match(regionalTable, /Pending NCR approval/);
  assert.doesNotMatch(regionalTable, />Approve<|>Reject</);
  const reviewTable = renderToStaticMarkup(createElement(LiveVideoTable, { videos: [current], canReview: true }));
  assert.match(reviewTable, />Approve</);
  assert.match(reviewTable, />Reject</);
  console.log("Approval action checks passed: request, permissions, approval, publication, rejection, resubmission.");
} finally {
  console.error = originalError;
  mock.restore();
}
