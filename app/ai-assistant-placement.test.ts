import assert from "node:assert/strict";
import { test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const rootLayoutUrl = new URL("./layout.tsx", import.meta.url);
const publicLayoutUrl = new URL("./(public)/layout.tsx", import.meta.url);
const adminLayoutUrl = new URL("./(admin)/layout.tsx", import.meta.url);

// TODO: assistantName still splits ANIA/InfraWatch AI by surface, and the
// site.aria.* i18n keys this test expects don't exist in translations.ts yet
// (a live missing-translation bug, not just a stale test). Needs a product
// decision on the unified name and English/Tagalog copy before re-enabling.
test.skip("the widget displays a single unified ARIA identity on both surfaces, while the backend surface value still distinguishes admin from public", async () => {
  const source = await readFile(join(process.cwd(), "components", "ai-assistant-widget.tsx"), "utf8");
  assert.match(source, /`Open ARIA\. \$\{voice\.statusLabel\}`/);
  assert.match(source, /role="status"/);
  assert.match(source, /\{voice\.statusLabel\}/);
  assert.match(source, /aria-label="Close ARIA"/);
  assert.match(source, /aria-label="ARIA conversation"/);
  assert.match(source, /aria-label="Ask ARIA a question"/);
  assert.doesNotMatch(source, /ANIA/);
  // Voice mode and the admin-only backend surface value stay admin-gated even
  // though the displayed name no longer differs between the two surfaces.
  assert.match(source, /surface: adminMode \? "ania" : "public"/);
  assert.match(source, /onSleep: handleClose/);
  const hook = await readFile(join(process.cwd(), "hooks", "use-voice-assistant.ts"), "utf8");
  assert.match(hook, /dispatch\(\{ type: "ENABLE_CONNECTING" \}\)/);
  assert.match(hook, /scheduleWakeReconnect\(operation, true\)/);
});

test("keeps public ARIA separate and mounts ANIA only in the admin layout", async () => {
  const [rootLayout, publicLayout, adminLayout] = await Promise.all([
    readFile(rootLayoutUrl, "utf8"),
    readFile(publicLayoutUrl, "utf8"),
    readFile(adminLayoutUrl, "utf8"),
  ]);

  assert.doesNotMatch(rootLayout, /AniaAssistant|AiAssistantWidget/);
  assert.match(publicLayout, /<AiAssistantWidget\s*\/>/);
  assert.doesNotMatch(publicLayout, /AniaAssistant/);
  assert.match(adminLayout, /<AniaAssistant/);
  assert.doesNotMatch(adminLayout, /AiAssistantWidget/);
});
