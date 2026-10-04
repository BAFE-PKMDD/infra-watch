import assert from "node:assert/strict";
import { beforeEach, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CitizenGuideContext } from "./citizen-guide-context";
import { applyTourUpdate, EMPTY_TOUR_PROGRESS, tourKey, type TourProgress } from "@/lib/tours/progress";
import { CITIZEN_GUIDES } from "@/lib/tours/citizen";

let pathname = "/citizen-feed";
mock.module("next/navigation", () => ({ usePathname: () => pathname }));
const { CitizenGuides, CitizenGuidesPanel } = await import("./citizen-guides");
const context = {
  session: null, loading: false, active: false, start: () => {}, overview: () => {}, submitted: () => {},
  progress: { automatic: true, seen: { [tourKey("citizen-feedback")]: "completed" as const } },
};
beforeEach(() => { pathname = "/citizen-feed"; });

test("the hydrated citizen panel matches the compact disclosure and supports replay", () => {
  const html = renderToStaticMarkup(<CitizenGuideContext.Provider value={context}><CitizenGuidesPanel /></CitizenGuideContext.Provider>);
  assert.match(html, /<details[^>]*data-tour="citizen-guides"/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
  assert.match(html, /Review guide: Feedback/);
  assert.equal((html.match(/>Completed</g) ?? []).length, 1);
  for (const title of ["E-Report", "Contact messages", "SMS reporting"]) assert.ok(html.includes(`Open guide: ${title}`));
  assert.doesNotMatch(html, /skills|achievement|lesson|<progress/i);
});

test("each finished guide is marked completed and finishing all four hides the panel", () => {
  let progress: TourProgress = EMPTY_TOUR_PROGRESS;
  for (const [index, guide] of CITIZEN_GUIDES.entries()) {
    progress = applyTourUpdate(progress, { tourId: guide.id, outcome: "completed", disableAutomatic: false });
    const html = renderToStaticMarkup(<CitizenGuideContext.Provider value={{ ...context, progress }}><CitizenGuidesPanel /></CitizenGuideContext.Provider>);
    if (index === CITIZEN_GUIDES.length - 1) assert.equal(html, "");
    else {
      assert.equal((html.match(/>Completed</g) ?? []).length, index + 1);
      assert.match(html, new RegExp(`Review guide: ${guide.title}`));
    }
  }
  const restored = JSON.parse(JSON.stringify(progress)) as TourProgress;
  assert.equal(renderToStaticMarkup(<CitizenGuideContext.Provider value={{ ...context, progress: restored }}><CitizenGuidesPanel /></CitizenGuideContext.Provider>), "", "saved completion also hides the panel on a later visit");
});

test("a skipped guide keeps the panel available even when all other guides are completed", () => {
  const progress = CITIZEN_GUIDES.reduce((value, guide) => applyTourUpdate(value, {
    tourId: guide.id, outcome: guide.id === "citizen-sms" ? "skipped" : "completed", disableAutomatic: false,
  }), EMPTY_TOUR_PROGRESS);
  const html = renderToStaticMarkup(<CitizenGuideContext.Provider value={{ ...context, progress }}><CitizenGuidesPanel /></CitizenGuideContext.Provider>);
  assert.match(html, /Open guide: SMS reporting/);
  assert.equal((html.match(/>Completed</g) ?? []).length, 3);
});

test("completed progress keeps the guide disclosure available during an active replay", () => {
  pathname = "/projects";
  const progress = CITIZEN_GUIDES.reduce((value, guide) => applyTourUpdate(value, { tourId: guide.id, outcome: "completed", disableAutomatic: false }), EMPTY_TOUR_PROGRESS);
  const html = renderToStaticMarkup(<CitizenGuideContext.Provider value={{ ...context, progress, active: true, session: { id: "replay", guide: "citizen-feedback", returnTo: "/projects", submitted: false } }}><CitizenGuidesPanel /></CitizenGuideContext.Provider>);
  assert.match(html, /data-tour="citizen-guides"/);
});

test("no citizen controls appear outside their context or on unrelated pages", () => {
  assert.equal(renderToStaticMarkup(<CitizenGuidesPanel />), "");
  pathname = "/dashboard";
  assert.equal(renderToStaticMarkup(<CitizenGuideContext.Provider value={context}><CitizenGuidesPanel /></CitizenGuideContext.Provider>), "");
});

test("guides never add a shortcut that bypasses the actual project directory", () => {
  pathname = "/projects";
  const render = (active: boolean) => renderToStaticMarkup(<CitizenGuideContext.Provider value={{ ...context, session: active ? { id: "attempt", guide: "citizen-feedback", returnTo: "/citizen-feed", submitted: false } : null }}><CitizenGuidesPanel /></CitizenGuideContext.Provider>);
  assert.doesNotMatch(render(true), /data-citizen="example-project"|Example irrigation canal/);
  assert.doesNotMatch(render(false), /data-citizen="example-project"/);
});

test("the hydration boundary preserves header/main siblings even with a cached citizen session", () => {
  pathname = "/";
  const render = (value: typeof context | null) => renderToStaticMarkup(<CitizenGuideContext.Provider value={value}>
    <header>Navigation</header><CitizenGuides /><main>Public page</main>
  </CitizenGuideContext.Provider>);
  const anonymous = render(null);
  assert.equal(anonymous, "<header>Navigation</header><main>Public page</main>");
  assert.equal(render(context), anonymous);
  assert.equal(render({ ...context, loading: true, progress: { automatic: true, seen: {} } }), anonymous);
});
