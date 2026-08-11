import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Pagination } from "./pagination";

test("uses a caller-provided item label", () => {
  const html = renderToStaticMarkup(
    Pagination({
      page: 1,
      totalPages: 1712,
      totalCount: 42781,
      itemLabel: "findings",
      onPageChange: () => undefined,
    }),
  );

  assert.match(html, /42,781 findings/);
  assert.doesNotMatch(html, /42,781 projects/);
});
