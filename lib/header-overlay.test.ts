import assert from "node:assert/strict";
import test from "node:test";

import { setHeaderOverlay, toggleHeaderOverlay } from "./header-overlay";

test("opening one header overlay closes the other", () => {
  const withUserMenuOpen = setHeaderOverlay(null, "user", true);
  const withNotificationsOpen = setHeaderOverlay(withUserMenuOpen, "notifications", true);

  assert.equal(withUserMenuOpen, "user");
  assert.equal(withNotificationsOpen, "notifications");
});

test("header overlays close from their trigger and open-state callback", () => {
  assert.equal(toggleHeaderOverlay("user", "user"), null);
  assert.equal(setHeaderOverlay("notifications", "notifications", false), null);
});
