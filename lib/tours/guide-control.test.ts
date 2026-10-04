import assert from "node:assert/strict";
import { test } from "bun:test";
import { guideControl, performGuideControlAction, type GuideControlAction } from "./guide-control";

const activate: GuideControlAction = { label: "Open example project", behavior: "activate" };
const focus: GuideControlAction = { label: "Enter details", behavior: "focus" };

function element(tag: string, options: { disabled?: boolean; hidden?: boolean; connected?: boolean; children?: HTMLElement[] } = {}) {
  const calls: string[] = [];
  const node = {
    isConnected: options.connected ?? true,
    getClientRects: () => options.hidden ? [] : [{}],
    closest: () => null,
    matches: (selector: string) => selector.split(", ").some((part) => {
      if (part === ":disabled") return Boolean(options.disabled);
      if (part === "a[href]") return tag === "a";
      if (part.startsWith("input:")) return tag === "input";
      return part === tag;
    }),
    querySelectorAll: (selector: string) => (options.children ?? []).filter((child) => child.matches(selector)),
    scrollIntoView: () => { calls.push("scroll"); },
    focus: () => { calls.push("focus"); },
    click: () => { calls.push("click"); },
  } as unknown as HTMLElement;
  return { node, calls };
}

test("an explicit guide action activates the highlighted link or button", () => {
  for (const tag of ["a", "button"]) {
    const target = element(tag);
    assert.equal(performGuideControlAction(target.node, activate), true);
    assert.deepEqual(target.calls, ["scroll", "focus", "click"]);
  }
});

test("field guidance focuses the field without clicking or submitting", () => {
  const field = element("textarea");
  assert.equal(performGuideControlAction(field.node, focus), true);
  assert.deepEqual(field.calls, ["scroll", "focus"]);
});

test("a highlighted form prefers its input and never activates an arbitrary child button", () => {
  const submit = element("button");
  const field = element("input");
  const form = element("form", { children: [submit.node, field.node] });
  assert.equal(guideControl(form.node, focus), field.node);
  assert.equal(performGuideControlAction(form.node, focus), true);
  assert.deepEqual(field.calls, ["scroll", "focus"]);
  assert.deepEqual(submit.calls, []);
  assert.equal(performGuideControlAction(form.node, activate), false);
  assert.deepEqual(form.calls, []);
});

test("missing, disabled, hidden, and detached controls cannot be activated", () => {
  assert.equal(performGuideControlAction(null, activate), false);
  for (const options of [{ disabled: true }, { hidden: true }, { connected: false }]) {
    const target = element("button", options);
    assert.equal(performGuideControlAction(target.node, activate), false);
    assert.deepEqual(target.calls, []);
  }
});
