import assert from "node:assert/strict";
import test from "node:test";

import { PATCH } from "./route";

test("rejects project correction attempts because Data Quality is recommendation-only", async () => {
  const response = await PATCH(
    new Request("http://localhost/api/admin/data-quality/projects/AMEFIP-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "budget", value: "1.00", reason: "Attempted correction" }),
    }),
    { params: Promise.resolve({ projectId: "AMEFIP-1" }) },
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET");
  assert.deepEqual(await response.json(), {
    error: "Data Quality provides recommendations only and cannot change project records.",
  });
});
