import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { FeedContributionActions } from "./feed-contribution-actions";

test("starts with one write-post entry point before showing submission choices", () => {
  const html = renderToStaticMarkup(<FeedContributionActions />);

  assert.match(html, /Write a post/);
  assert.match(html, /Share project feedback or report an issue/);
  assert.doesNotMatch(html, /Share what you observed/);
  assert.doesNotMatch(html, /href="\/projects"/);
  assert.doesNotMatch(html, /href="\/report-issue\/new"/);
  assert.doesNotMatch(html, /What would you like to share about this project/);
});
