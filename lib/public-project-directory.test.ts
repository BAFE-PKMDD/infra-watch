import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePublicProjectDirectoryState,
  safeProjectsReturnHref,
  serializePublicProjectDirectoryState,
  type PublicProjectDirectoryState,
} from "./public-project-directory";

const completeState: PublicProjectDirectoryState = {
  searchQuery: "solar pump",
  program: "ins",
  region: "130000000",
  province: "133900000",
  municipality: "133901000",
  barangay: "133901001",
  status: "completed",
  year: "2026",
  sort: "budget-desc",
  view: "grid",
};

test("round-trips shareable project-directory filters through URL parameters", () => {
  const serialized = serializePublicProjectDirectoryState(completeState);
  assert.deepEqual(parsePublicProjectDirectoryState(serialized), completeState);
});

test("rejects invalid directory enums without discarding independently valid filters", () => {
  const params = new URLSearchParams("program=invalid&status=completed&sort=hacked&view=map");
  assert.deepEqual(parsePublicProjectDirectoryState(params), {
    searchQuery: "",
    program: "all",
    region: "all",
    province: "all",
    municipality: "all",
    barangay: "all",
    status: "completed",
    year: "all",
    sort: "newest",
    view: "map",
  });
});

test("omits default values from shareable project-directory URLs", () => {
  const state = parsePublicProjectDirectoryState(new URLSearchParams());
  assert.equal(serializePublicProjectDirectoryState(state).toString(), "");
});

test("accepts only the public directory as a project-passport return target", () => {
  assert.equal(safeProjectsReturnHref("/projects?q=tractor"), "/projects?q=tractor");
  assert.equal(safeProjectsReturnHref("/projects"), "/projects");
  assert.equal(safeProjectsReturnHref("//evil.example/projects"), "/projects");
  assert.equal(safeProjectsReturnHref("/projects/../../dashboard"), "/projects");
  assert.equal(safeProjectsReturnHref("https://evil.example"), "/projects");
});
