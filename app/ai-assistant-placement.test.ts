import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const rootLayoutUrl = new URL("./layout.tsx", import.meta.url);
const publicLayoutUrl = new URL("./(public)/layout.tsx", import.meta.url);
const adminLayoutUrl = new URL("./(admin)/layout.tsx", import.meta.url);

test("admin assistant uses ANIA across visible and accessible surfaces", async () => {
  const source = await readFile(join(process.cwd(), "components", "ai-assistant-widget.tsx"), "utf8");
  assert.match(source, /`Open ANIA\. \$\{voice\.statusLabel\}`/);
  assert.match(source, /role="status"/);
  assert.match(source, /\{voice\.statusLabel\}/);
  assert.match(source, /adminMode \? "Close ANIA"/);
  assert.match(source, /adminMode \? "ANIA conversation"/);
  assert.match(source, /adminMode \? "Ask ANIA a question"/);
  assert.match(source, /surface: adminMode \? "ania" : "public"/);
  assert.match(source, /onSleep: handleClose/);
  const hook = await readFile(join(process.cwd(), "hooks", "use-voice-assistant.ts"), "utf8");
  assert.match(hook, /dispatch\(\{ type: "ENABLE_CONNECTING" \}\)/);
  assert.match(hook, /scheduleWakeReconnect\(operation, true\)/);
});

test("keeps public InfraWatch AI separate and mounts ANIA only in the admin layout", async () => {
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
