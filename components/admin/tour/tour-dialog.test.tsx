import assert from "node:assert/strict";
import { test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TourDialog from "./tour-dialog";
import { TourContext, TourLauncher } from "./tour-launcher";

test("tour has a named native dialog, step progress, dismissal, and labeled opt-out", () => {
  const html = renderToStaticMarkup(createElement(TourDialog, {
    tour: { id: "test", title: "Test tour", steps: [{ title: "Welcome", description: "Review your project scope." }, { title: "Tour complete", description: "Ready." }] },
    automatic: true, onClose: () => {},
  }));
  assert.match(html, /<dialog[^>]*aria-labelledby="tour-title"[^>]*aria-describedby="tour-description"/);
  assert.match(html, /Step 1 of 2/);
  assert.match(html, /Skip tour/);
  assert.match(html, /aria-label="Close tour"/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Don&#x27;t show tours automatically/);
  assert.match(html, /disabled=""[^>]*>Back/);
  assert.match(html, />Start tour</);
});

test("saved opt-out is reflected when replaying the tour", () => {
  const html = renderToStaticMarkup(createElement(TourDialog, {
    tour: { id: "test", title: "Test tour", steps: [{ title: "Tour complete", description: "Ready." }] },
    automatic: false, onClose: () => {},
  }));
  assert.match(html, /type="checkbox"[^>]*checked=""/);
  assert.match(html, />Done</);
});

test("tour launchers are context-aware and page guides are hidden on unsupported routes", () => {
  assert.equal(renderToStaticMarkup(createElement(TourLauncher)), "");
  const render = (hasPageTour: boolean, overview = false) => renderToStaticMarkup(createElement(TourContext.Provider, {
    value: { start: () => {}, hasPageTour },
  }, createElement(TourLauncher, { overview })));
  assert.match(render(true), /Take a tour/);
  assert.equal(render(false), "");
  assert.match(render(false, true), /Tutorials/);
});
