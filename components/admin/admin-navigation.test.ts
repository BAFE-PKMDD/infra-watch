import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const desktopSource = readFileSync(new URL("./admin-sidebar.tsx", import.meta.url), "utf8");
const mobileSource = readFileSync(new URL("./admin-mobile-nav.tsx", import.meta.url), "utf8");

for (const [surface, source] of [
  ["desktop sidebar", desktopSource],
  ["mobile navigation", mobileSource],
] as const) {
  test(`${surface} groups E-Report and SMS Grievance under Reported Issues`, () => {
    assert.match(source, /Reported Issues/);
    assert.match(source, /E-Report/);
    assert.match(source, /SMS Grievance/);
    assert.match(source, /href:\s*"\/issues"|href="\/issues"/);
    assert.match(source, /href:\s*"\/issues\/sms-review"|href="\/issues\/sms-review"/);
  });

  test(`${surface} exposes an accessible expandable control`, () => {
    assert.match(source, /aria-expanded/);
    assert.match(source, /aria-controls/);
    assert.match(source, /ChevronDown/);
  });
}

test("SMS navigation stays hidden when the development-only workspace is unavailable", () => {
  assert.match(desktopSource, /process\.env\.NODE_ENV !== "production"/);
  assert.match(mobileSource, /process\.env\.NODE_ENV !== "production"/);
});

test("contact messages inbox is reachable from desktop and mobile navigation", () => {
  for (const source of [desktopSource, mobileSource]) {
    assert.match(source, /href:\s*"\/contact-messages"/);
    assert.match(source, /resource:\s*"contact_messages"/);
  }
});
