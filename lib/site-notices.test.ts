import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  bannerContrastError,
  buildSiteNotices,
  contrastRatio,
  isMaintenanceExemptPath,
  isMaintenanceExemptRole,
  parseBannerSettings,
  parseMaintenanceValue,
  shouldShowMaintenance,
} from "./site-notices";
import { DEFAULT_BANNER_SETTINGS } from "@/types/banner.types";

test("maintenance is on only for an explicit true value", () => {
  assert.equal(parseMaintenanceValue(true), true);
  assert.equal(parseMaintenanceValue("true"), true);
  assert.equal(parseMaintenanceValue(" TRUE "), true);
  assert.equal(parseMaintenanceValue("1"), true);
  assert.equal(parseMaintenanceValue(false), false);
  assert.equal(parseMaintenanceValue("false"), false);
  assert.equal(parseMaintenanceValue(1), false);
  assert.equal(parseMaintenanceValue({ enabled: true }), false);
  assert.equal(parseMaintenanceValue(null), false);
  assert.equal(parseMaintenanceValue(undefined), false);
});

test("banner settings merge over the defaults and stay off when nothing is stored", () => {
  assert.deepEqual(parseBannerSettings(null), DEFAULT_BANNER_SETTINGS);
  assert.deepEqual(parseBannerSettings(undefined), DEFAULT_BANNER_SETTINGS);
  const parsed = parseBannerSettings({ isEnabled: true, message: "Maintenance on Sunday." });
  assert.equal(parsed.isEnabled, true);
  assert.equal(parsed.message, "Maintenance on Sunday.");
  assert.equal(parsed.backgroundColor, DEFAULT_BANNER_SETTINGS.backgroundColor);
});

test("banner settings stored as a JSON string are read, and corrupt values fall back to defaults", () => {
  const fromString = parseBannerSettings(JSON.stringify({ isEnabled: true, message: "Hello", textColor: "#000000" }));
  assert.equal(fromString.isEnabled, true);
  assert.equal(fromString.textColor, "#000000");
  assert.deepEqual(parseBannerSettings("{not json"), DEFAULT_BANNER_SETTINGS);
  assert.deepEqual(parseBannerSettings({ isEnabled: true, message: "x", backgroundColor: "red" }), DEFAULT_BANNER_SETTINGS);
  assert.deepEqual(parseBannerSettings({ isEnabled: true, message: "   " }), DEFAULT_BANNER_SETTINGS);
  assert.deepEqual(parseBannerSettings({ isEnabled: true, message: "x".repeat(301) }), DEFAULT_BANNER_SETTINGS);
});

test("site notices expose the banner only while it is switched on", () => {
  const off = buildSiteNotices(false, { isEnabled: false, message: "Hidden" });
  assert.equal(off.maintenance, false);
  assert.equal(off.banner, null);

  const on = buildSiteNotices(true, { isEnabled: true, message: "Shown" });
  assert.equal(on.maintenance, true);
  assert.equal(on.banner?.message, "Shown");
});

test("staff roles and the auth screens are exempt from the maintenance notice", () => {
  for (const role of ["admin", "regional_admin", "moderator"]) assert.equal(isMaintenanceExemptRole(role), true);
  for (const role of ["citizen", "", null, undefined, "unknown"]) assert.equal(isMaintenanceExemptRole(role), false);

  assert.equal(isMaintenanceExemptPath("/sign-in"), true);
  assert.equal(isMaintenanceExemptPath("/forget-password"), true);
  assert.equal(isMaintenanceExemptPath("/sign-in/verify"), true);
  assert.equal(isMaintenanceExemptPath("/sign-installer"), false);
  assert.equal(isMaintenanceExemptPath("/projects"), false);
  assert.equal(isMaintenanceExemptPath(null), false);
});

test("the maintenance notice covers visitors and citizens but never staff or sign-in", () => {
  const base = { maintenance: true, authLoading: false, role: null as string | null, pathname: "/projects" };
  assert.equal(shouldShowMaintenance(base), true);
  assert.equal(shouldShowMaintenance({ ...base, role: "citizen" }), true);
  assert.equal(shouldShowMaintenance({ ...base, role: "admin" }), false);
  assert.equal(shouldShowMaintenance({ ...base, role: "moderator" }), false);
  assert.equal(shouldShowMaintenance({ ...base, pathname: "/sign-in" }), false);
  assert.equal(shouldShowMaintenance({ ...base, maintenance: false }), false);
});

test("nothing is shown while the session is still loading, so staff never see a flash", () => {
  assert.equal(shouldShowMaintenance({ maintenance: true, authLoading: true, role: null, pathname: "/projects" }), false);
});

test("contrast ratio matches known WCAG values", () => {
  assert.equal(contrastRatio("#000000", "#ffffff")?.toFixed(1), "21.0");
  assert.equal(contrastRatio("#ffffff", "#ffffff")?.toFixed(1), "1.0");
  assert.equal(contrastRatio("#047857", "#ffffff") !== null && (contrastRatio("#047857", "#ffffff") as number) >= 4.5, true);
  assert.equal(contrastRatio("#10b981", "#ffffff") !== null && (contrastRatio("#10b981", "#ffffff") as number) < 4.5, true);
  assert.equal(contrastRatio("nope", "#ffffff"), null);
});

test("banner contrast validation rejects hard-to-read colors and accepts the defaults", () => {
  assert.equal(bannerContrastError({ backgroundColor: "#047857", textColor: "#ffffff" }), null);
  assert.match(bannerContrastError({ backgroundColor: "#10b981", textColor: "#ffffff" }) ?? "", /too similar/);
  assert.equal(bannerContrastError({ backgroundColor: "red", textColor: "#ffffff" }), "Invalid color format");
  assert.equal(bannerContrastError({ backgroundColor: DEFAULT_BANNER_SETTINGS.backgroundColor, textColor: DEFAULT_BANNER_SETTINGS.textColor }), null);
});
