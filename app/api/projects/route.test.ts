import assert from "node:assert/strict";
import { spyOn, test } from "bun:test";
import { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { GET } from "./route";

test("rejects invalid project lookup limits before accessing the database", async () => {
  const select = spyOn(db, "select").mockImplementation(() => {
    throw new Error("Invalid limits must not reach the database");
  });
  try {
    for (const limit of [
      "-1",
      "NaN",
      "abc",
      "Infinity",
      "0",
      "1.5",
      "",
      "26",
    ]) {
      const response = await GET(
        new NextRequest(`http://localhost/api/projects?limit=${limit}`),
      );
      assert.equal(response.status, 400, limit);
      assert.match((await response.json()).error, /limit/i);
    }
    assert.equal(select.mock.calls.length, 0);
  } finally {
    select.mockRestore();
  }
});

test("keeps every project lookup branch bounded, including nearby fallback", async () => {
  const limits: number[] = [];
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async (limit: number) => {
      limits.push(limit);
      return [];
    },
  };
  const select = spyOn(db, "select").mockReturnValue(
    query as unknown as ReturnType<typeof db.select>,
  );
  try {
    for (const [params, expected] of [
      ["", [10]],
      ["?limit=1", [1]],
      ["?type=road&limit=25", [25]],
      ["?farmOperation=Irrigation&limit=20", [20]],
      ["?search=test&limit=12", [12, 12]],
    ] as const) {
      limits.length = 0;
      const response = await GET(
        new NextRequest(`http://localhost/api/projects${params}`),
      );
      assert.equal(response.status, 200, params);
      assert.deepEqual(limits, expected, params);
    }
  } finally {
    select.mockRestore();
  }
});
