import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// A literal "/something.jpg" in a component is served from public/. A missing file renders
// as a broken image (the Contact hero once pointed at /hero-road.jpg, which never existed).
const SOURCE_DIRS = ["app", "components", "lib"];
const ASSET_PATH = /["'`](\/[\w./-]+\.(?:jpe?g|png|webp|avif|gif|svg))["'`]/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test("every static image path in the app exists in public/", () => {
  const missing: string[] = [];
  for (const file of SOURCE_DIRS.flatMap((dir) => sourceFiles(join(process.cwd(), dir)))) {
    for (const [, asset] of readFileSync(file, "utf8").matchAll(ASSET_PATH)) {
      if (!existsSync(join(process.cwd(), "public", asset))) {
        missing.push(`${file.slice(process.cwd().length + 1)}: ${asset}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
