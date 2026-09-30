import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

import { geolocationMessageText } from "./geo-evidence-upload";
import { site } from "@/i18n/sections/site";
import { translate } from "@/i18n/translate";

test("every message useGeolocation reports is shown in the visitor's language", () => {
  const source = readFileSync(new URL("../../hooks/use-geolocation.ts", import.meta.url), "utf8");
  const messages = [...new Set(source.match(/"[A-Z][^"]*\."/g)?.map((quoted) => quoted.slice(1, -1)) ?? [])];
  assert.ok(messages.length > 0, "expected the hook's error messages");
  assert.deepEqual(messages.sort(), Object.values(site.en.geolocation).sort());

  const tl = (path: string, variables?: Record<string, string | number>) => translate("tl", path, variables);
  const en = (path: string, variables?: Record<string, string | number>) => translate("en", path, variables);
  for (const [key, message] of Object.entries(site.en.geolocation)) {
    assert.equal(geolocationMessageText(message, en), message);
    assert.equal(geolocationMessageText(message, tl), site.tl.geolocation[key as keyof typeof site.tl.geolocation]);
  }
  // Anything else (a browser's own error text) is shown as sent.
  assert.equal(geolocationMessageText("Position unavailable (kCLErrorLocationUnknown)", tl), "Position unavailable (kCLErrorLocationUnknown)");
});
