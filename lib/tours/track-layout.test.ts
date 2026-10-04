import assert from "node:assert/strict";
import { test } from "bun:test";
import { trackTourLayout } from "./track-layout";

function frameClock() {
  let nextId = 0;
  const queue = new Map<number, FrameRequestCallback>();
  const page = Object.assign(new EventTarget(), { hidden: false });
  const view = {
    requestAnimationFrame: (callback: FrameRequestCallback) => { const id = nextId++; queue.set(id, callback); return id; },
    cancelAnimationFrame: (id: number) => { queue.delete(id); },
  };
  return {
    view, page,
    pending: () => queue.size,
    advance: () => { const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach((callback) => callback(0)); },
    visible: (visible: boolean) => { page.hidden = !visible; page.dispatchEvent(new Event("visibilitychange")); },
  };
}

test("the highlight follows an 80px form entrance all the way to its final position without resize events", () => {
  const clock = frameClock();
  let translation = 80;
  const target = { getBoundingClientRect: () => ({ left: 634 + translation, top: 400, width: 638, height: 194 }) };
  const button = { getBoundingClientRect: () => ({ left: 1220 + translation, top: 560, width: 50, height: 32 }) };
  const positions: Array<[number, number]> = [];
  const stop = trackTourLayout(() => positions.push([target.getBoundingClientRect().left, button.getBoundingClientRect().left]), clock.view, clock.page);
  for (const offset of [80, 60, 20, 0]) {
    translation = offset;
    clock.advance();
    assert.equal(clock.pending(), 1, "there should be exactly one measurement per frame");
  }
  assert.deepEqual(positions, [[714, 1300], [694, 1280], [654, 1240], [634, 1220]]);
  clock.advance();
  assert.deepEqual(positions.at(-1), [634, 1220], "the final animation position must not remain stale");
  stop();
  assert.equal(clock.pending(), 0);
});

test("scroll, resize, and replacement targets are measured on the next frame", () => {
  const clock = frameClock();
  type Bounds = { left: number; top: number; width: number } | null;
  let bounds: Bounds = { left: 80, top: 600, width: 640 };
  const positions: Bounds[] = [];
  const stop = trackTourLayout(() => { positions.push(bounds ? { ...bounds } : null); }, clock.view, clock.page);
  clock.advance();
  bounds = { left: 80, top: 200, width: 640 }; clock.advance();
  bounds = { left: 16, top: 120, width: 320 }; clock.advance();
  bounds = null; clock.advance();
  bounds = { left: 40, top: 260, width: 280 }; clock.advance();
  assert.deepEqual(positions, [
    { left: 80, top: 600, width: 640 }, { left: 80, top: 200, width: 640 },
    { left: 16, top: 120, width: 320 }, null, { left: 40, top: 260, width: 280 },
  ]);
  stop();
});

test("tracking pauses in hidden tabs and cleans up when a guide closes", () => {
  const clock = frameClock();
  let reads = 0;
  const stop = trackTourLayout(() => { reads++; }, clock.view, clock.page);
  clock.advance();
  clock.visible(false);
  clock.advance();
  assert.equal(reads, 1);
  assert.equal(clock.pending(), 0);
  clock.visible(true); clock.visible(true);
  assert.equal(clock.pending(), 1);
  clock.advance();
  assert.equal(reads, 2);
  stop();
  clock.visible(false); clock.visible(true); clock.advance();
  assert.equal(clock.pending(), 0);
  assert.equal(reads, 2);
});

test("closing a guide during a measurement cannot schedule another frame", () => {
  const clock = frameClock();
  const stop = trackTourLayout(() => stop(), clock.view, clock.page);
  clock.advance();
  assert.equal(clock.pending(), 0);
});
