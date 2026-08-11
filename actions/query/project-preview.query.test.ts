import assert from "node:assert/strict";
import test from "node:test";

import { projectPreviewBudget } from "@/lib/project-preview-budget";

test("keeps a missing approved budget missing instead of substituting the supplier bid", () => {
  assert.equal(projectPreviewBudget(null), null);
  assert.equal(projectPreviewBudget(""), null);
  assert.equal(projectPreviewBudget("1250000.50"), 1_250_000.5);
});
