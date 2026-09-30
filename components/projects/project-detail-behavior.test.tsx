import assert from "node:assert/strict";
import { test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { LanguageProvider } from "@/providers/language-provider";
import { PhotoCard, PhotoGridView } from "./photo-grid-view";
import { ProjectPhotos } from "./project-photos";
import { ProjectOverview } from "./project-overview";
import { ProjectHighlights } from "./project-highlights";
import type { GeoTag } from "@/types/photo.types";
import type { ProjectDetail } from "@/types";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;
function render(element: ReactElement, query = "") {
  return renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router },
    createElement(SearchParamsContext.Provider, { value: new URLSearchParams(query) },
      createElement(LanguageProvider, null, element))));
}

test("numeric GPS photos render with keyboard-operable controls", () => {
  const tag = { url: "https://storage.bafe.gov.ph/test.jpg", latitude: 14.5, longitude: 121 } as unknown as GeoTag;
  const html = render(createElement(PhotoCard, { tag, index: 0, filteredPhotos: [tag], onPhotoClick() {} }));
  assert.match(html, /14\.5/);
  assert.match(html, /121/);
  assert.match(html, /role="button"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /focus-visible:outline/);
});

test("photo albums expose a keyboard focus target and a visible label", () => {
  const html = render(createElement(PhotoGridView, {
    geotags: [{ url: "https://storage.bafe.gov.ph/test.jpg", category: "Validation Photos" }],
    onPhotoClick() {},
  }));
  assert.match(html, /Validation Photos/);
  assert.match(html, /role="button" tabindex="0"/);
  assert.match(html, /focus-visible:outline/);
});

test("a photo-free project keeps map controls when it has recorded coordinates or KML", () => {
  for (const location of [{ projectCoordinates: "14.5, 121" }, { kmlLink: "https://storage.bafe.gov.ph/path.kml" }]) {
    const html = render(createElement(ProjectPhotos, { projectId: "test", geotags: [], ...location }));
    assert.match(html, />Maps</);
    assert.doesNotMatch(html, />No Photos Yet</);
  }
  const empty = render(createElement(ProjectPhotos, { projectId: "test", geotags: [] }));
  assert.match(empty, /No Photos Yet/);
});

test("both detail summaries preserve the public on-hold status", () => {
  const project: ProjectDetail = {
    id: "test", code: "test", name: "Test project", location: "Test location",
    implementingAgency: "Test agency", budget: null, startDate: "Unavailable",
    duration: "Unavailable", status: "suspended", stage: "On going", publicStage: "on_hold",
    completionDate: "Unavailable", contractor: "Unavailable", projectLength: "Unavailable",
    description: "Test project", updates: [],
  };
  for (const component of [ProjectOverview, ProjectHighlights]) {
    const html = render(createElement(component, { project }));
    assert.match(html, /On hold/);
    assert.doesNotMatch(html, />On going</);
    assert.doesNotMatch(html, />Not yet completed</);
  }
});
