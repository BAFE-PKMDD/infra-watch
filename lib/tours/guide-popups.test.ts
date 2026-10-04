import assert from "node:assert/strict";
import { test } from "bun:test";
import { guidePopups } from "./guide-popups";
import { tourPanelPosition, tourRectUnion, type TourRect } from "./position";

function page() {
  const nodes = new Map<string, HTMLElement>();
  const doc = { getElementById: (id: string) => nodes.get(id) ?? null, defaultView: { getComputedStyle: () => ({ visibility: "visible" }) } };
  const element = (attributes: Record<string, string> = {}, children: HTMLElement[] = [], surface?: HTMLElement) => {
    const node = {
      ownerDocument: doc, isConnected: true,
      getAttribute: (name: string) => attributes[name] ?? null,
      getClientRects: () => "hidden" in attributes ? [] : [{}],
      querySelectorAll: () => children,
      matches: () => attributes.role === "listbox" || attributes["data-slot"] === "select-content" || "data-citizen-guide-options" in attributes,
      closest: (selector: string) => selector === '[data-slot="select-content"]'
        ? surface ?? null
        : "data-closed" in attributes || attributes["data-state"] === "closed" || attributes["aria-hidden"] === "true" ? node : null,
    } as unknown as HTMLElement;
    if (attributes.id) nodes.set(attributes.id, node);
    return node;
  };
  return { element };
}

test("the active Select resolves its portaled list to the entire popup, including lower options and scroll arrows", () => {
  const { element } = page();
  const popup = element({ "data-slot": "select-content" });
  element({ id: "farm-list", role: "listbox" }, [], popup);
  element({ id: "unrelated-list", role: "listbox" });
  const trigger = element({ "aria-controls": "farm-list", "aria-expanded": "true" });
  const form = element({}, [trigger]);
  assert.deepEqual(guidePopups(form), [popup]);
  assert.deepEqual(guidePopups(trigger), [popup], "a directly highlighted dropdown must work too");
});

test("a form with several dropdowns follows only open, linked options and removes the highlight on close", () => {
  const { element } = page();
  const region = element({ id: "region-list", role: "listbox" });
  element({ id: "province-list", role: "listbox" });
  const attributes = { "aria-controls": "region-list", "aria-expanded": "true" };
  const form = element({}, [element(attributes), element({ "aria-controls": "province-list", "aria-expanded": "false" })]);
  assert.deepEqual(guidePopups(form), [region]);
  attributes["aria-expanded"] = "false";
  assert.deepEqual(guidePopups(form), []);
  attributes["aria-expanded"] = "true";
  assert.deepEqual(guidePopups(form), [region]);
});

test("project search popups are linked by their own input without exposing unrelated page controls", () => {
  const { element } = page();
  const results = element({ id: "project-results", "data-citizen-guide-options": "" });
  element({ id: "page-section" });
  const search = element({ "aria-controls": "project-results page-section missing-id", "aria-owns": "project-results" });
  assert.deepEqual(guidePopups(search), [results], "multiple ARIA links must not duplicate the opening");
  assert.deepEqual(guidePopups(element()), []);
  assert.deepEqual(guidePopups(null), []);
});

test("closed, hidden, and detached popup content never remains highlighted", () => {
  const { element } = page();
  const states: Array<Record<string, string>> = [{ "data-closed": "" }, { "data-state": "closed" }, { "aria-hidden": "true" }, { hidden: "" }];
  for (const state of states) {
    element({ id: "options", role: "listbox", ...state });
    assert.deepEqual(guidePopups(element({ "aria-controls": "options" })), []);
  }
  const detached = element({ id: "detached", role: "listbox" });
  Object.defineProperty(detached, "isConnected", { value: false });
  assert.deepEqual(guidePopups(element({ "aria-controls": "detached" })), []);
});

function overlaps(a: TourRect, b: TourRect) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

test("the farm-operation spotlight expands past the form to its last dropdown option", () => {
  const field = { left: 629, top: 397, width: 647, height: 194 };
  const dropdown = { left: 633, top: 494, width: 640, height: 254 };
  const combined = tourRectUnion([field, dropdown])!;
  assert.deepEqual(combined, { left: 629, top: 397, width: 647, height: 351 });
  const panel = { width: 360, height: 250 };
  const position = tourPanelPosition(combined, { width: 1920, height: 994 }, panel);
  assert.equal(overlaps({ ...position, ...panel }, dropdown), false);
  assert.deepEqual(tourRectUnion([field]), field, "closing the dropdown restores the original field highlight");
  assert.equal(tourRectUnion([null, { ...field, width: 0 }]), null);
});

test("a dropdown opening above its input stays visible and a narrow-screen coach uses the free space above it", () => {
  const field = { left: 16, top: 500, width: 343, height: 140 };
  const dropdown = { left: 16, top: 380, width: 343, height: 220 };
  const combined = tourRectUnion([field, dropdown])!;
  assert.deepEqual(combined, { left: 16, top: 380, width: 343, height: 260 });
  const panel = { width: 343, height: 250 };
  const position = tourPanelPosition(combined, { width: 375, height: 667 }, panel);
  assert.equal(overlaps({ ...position, ...panel }, combined), false, "always docking at the bottom would cover the dropdown");
});
