import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const rootLayoutUrl = new URL("./layout.tsx", import.meta.url);
const publicLayoutUrl = new URL("./(public)/layout.tsx", import.meta.url);

test("mounts InfraWatch AI only in the public route layout", async () => {
  const [rootLayout, publicLayout] = await Promise.all([
    readFile(rootLayoutUrl, "utf8"),
    readFile(publicLayoutUrl, "utf8"),
  ]);

  assert.doesNotMatch(rootLayout, /AiAssistantWidget/);
  assert.match(publicLayout, /<AiAssistantWidget\s*\/>/);
});