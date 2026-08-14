import assert from "node:assert/strict";
import test from "node:test";

import {
  aniaPdfFilename,
  createPdfPageSlices,
} from "./ania-answer-pdf";

test("creates contiguous PDF slices without dropping chart pixels", () => {
  assert.deepEqual(createPdfPageSlices({
    canvasWidth: 1800,
    canvasHeight: 5400,
    pageWidth: 555,
    pageHeight: 802,
  }), [
    { sourceY: 0, sourceHeight: 2601 },
    { sourceY: 2601, sourceHeight: 2601 },
    { sourceY: 5202, sourceHeight: 198 },
  ]);
});

test("uses stable PDF filenames for ANIA responses and executive briefs", () => {
  assert.equal(aniaPdfFilename("2026-08-14", 2), "ania-answer-2026-08-14-2.pdf");
  assert.equal(aniaPdfFilename("2026-08-14"), "ania-executive-brief-2026-08-14.pdf");
  assert.equal(aniaPdfFilename("invalid/date", 1), "ania-answer-1.pdf");
});
