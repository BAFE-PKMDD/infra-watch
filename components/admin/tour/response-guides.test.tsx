import assert from "node:assert/strict";
import { test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TourContext } from "./tour-launcher";
import { ResponseGuides } from "./response-guides";
import { availableResponseLessons } from "@/lib/tours/tutorials";
import { tourKey } from "@/lib/tours/progress";

test("response guides are collapsed by default and preserve replay without course-style progress", () => {
  const html = renderToStaticMarkup(<TourContext.Provider value={{ start: () => {}, hasPageTour: true, learning: {
    lessons: availableResponseLessons({ role: "admin" }), loading: false, active: false, startLesson: () => {},
    progress: { automatic: true, seen: { [tourKey("live-reply")]: "completed", [tourKey("live-sms-reply")]: "skipped" } },
  } }}><ResponseGuides /></TourContext.Provider>);
  assert.match(html, /<details[^>]*data-tour="response-guides"/);
  assert.doesNotMatch(html, /<details[^>]*\bopen(?:=|\s|>)/);
  assert.match(html, /<summary/);
  for (const channel of ["E-Report", "Feedback", "SMS Grievances", "Contact Messages"]) assert.ok(html.includes(channel));
  assert.match(html, /Review guide: E-Report/);
  assert.match(html, /Open guide: SMS Grievances/);
  assert.doesNotMatch(html, /skills|achievement|lesson|<progress|Not completed|Delete|Publish a public summary|Add a staff note/i);
});

test("the Projects fallback exposes lessons only for staff without an analytics landing page", () => {
  const render = (homePath: string) => renderToStaticMarkup(<TourContext.Provider value={{ start: () => {}, hasPageTour: true, learning: {
    lessons: availableResponseLessons({ role: "moderator" }), loading: false, active: false, startLesson: () => {}, homePath,
    progress: { automatic: true, seen: {} },
  } }}><ResponseGuides fallbackOnly /></TourContext.Provider>);
  assert.equal(render("/dashboard"), "");
  assert.match(render("/admin-projects"), /Response guides/);
});
