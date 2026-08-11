import assert from "node:assert/strict";
import test from "node:test";

import { getProjectMarkerColor } from "./public-project-map";

test("map marker colors match the public project status legend", () => {
  assert.equal(getProjectMarkerColor("completed"), "#22c55e");
  assert.equal(getProjectMarkerColor("on going"), "#eab308");
  assert.equal(getProjectMarkerColor("not yet started"), "#ef4444");
  assert.equal(getProjectMarkerColor("unrecognized"), "#64748b");
});
