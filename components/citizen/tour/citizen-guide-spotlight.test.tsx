import assert from "node:assert/strict";
import { test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CitizenGuideSpotlight } from "./citizen-guide-spotlight";

test("the field and its forward button both have clear openings in one overlay", () => {
  const html = renderToStaticMarkup(<CitizenGuideSpotlight rects={[
    { left: 20, top: 100, width: 400, height: 240 },
    { left: 320, top: 290, width: 80, height: 44 },
  ]} />);
  assert.equal((html.match(/<mask\b/g) ?? []).length, 1);
  assert.equal((html.match(/fill="black"/g) ?? []).length, 2, "overlapping highlights use the same mask so one cannot dim the other");
  assert.equal((html.match(/box-shadow:none/g) ?? []).length, 2);
  assert.doesNotMatch(html, /evenodd/);
});

test("no highlight is drawn while waiting for a page target", () => {
  assert.equal(renderToStaticMarkup(<CitizenGuideSpotlight rects={[]} />), "");
});
