import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");

test("the production image build defines the GeoServer public env the map overlays need", () => {
  // NEXT_PUBLIC_* values are inlined at build time and .dockerignore drops .env files,
  // so a missing ARG silently turns every shapefile overlay off in production.
  assert.match(dockerfile, /^ARG NEXT_PUBLIC_GEOSERVER_URL=https:\/\/\S+/m);
  assert.match(dockerfile, /^ARG NEXT_PUBLIC_GEOSERVER_WORKSPACE=\S+/m);
  assert.match(dockerfile, /NEXT_PUBLIC_GEOSERVER_URL=\$\{NEXT_PUBLIC_GEOSERVER_URL\}/);
  assert.match(dockerfile, /NEXT_PUBLIC_GEOSERVER_WORKSPACE=\$\{NEXT_PUBLIC_GEOSERVER_WORKSPACE\}/);
});

test("the ENV block keeps one variable per continuation line", () => {
  const envBlock = /^ENV NEXT_PUBLIC_APP_URL=[\s\S]*?(?=\r?\n\r?\n)/m.exec(dockerfile)?.[0] ?? "";
  const lines = envBlock.split(/\r?\n/);

  assert.ok(lines.length === 7, "expected every NEXT_PUBLIC_* variable on its own line");
  lines.slice(0, -1).forEach((line) => assert.match(line, / \\$/, line));
  lines.forEach((line) => assert.equal((line.match(/NEXT_PUBLIC_\w+=/g) ?? []).length, 1, line));
});
