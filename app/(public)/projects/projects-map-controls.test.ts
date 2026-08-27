import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const directorySource = readFileSync(
  new URL("./projects-directory-client.tsx", import.meta.url),
  "utf8",
);

const querySource = readFileSync(
  new URL("../../../actions/query/public-projects.query.ts", import.meta.url),
  "utf8",
);

test("the public map provides an accessible native fullscreen toggle", () => {
  assert.match(directorySource, /requestFullscreen/);
  assert.match(directorySource, /document\.exitFullscreen/);
  assert.match(directorySource, /fullscreenchange/);
  assert.match(directorySource, /aria-label=\{isMapFullscreen \? "Exit map fullscreen" : "View map fullscreen"\}/);
});

test("the public map filters coordinate-backed markers by source project type", () => {
  assert.match(querySource, /projectType:\s*projects\.projectType/);
  assert.match(directorySource, /aria-label="Project type"/);
  assert.match(directorySource, /setSelectedPin\(null\)/);
  assert.match(directorySource, /mapProjectType/);
});