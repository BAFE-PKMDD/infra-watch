import assert from "node:assert/strict";
import test from "node:test";
import type { ContextType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { LanguageProvider } from "@/providers/language-provider";
import { FeedContributionActions } from "./feed-contribution-actions";

// LanguageProvider needs the App Router context; the server render never navigates, so a no-op router is enough.
const noopRouter = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
} as unknown as NonNullable<ContextType<typeof AppRouterContext>>;

test("starts with one write-post entry point before showing submission choices", () => {
  const html = renderToStaticMarkup(
    <AppRouterContext.Provider value={noopRouter}>
      <LanguageProvider>
        <FeedContributionActions />
      </LanguageProvider>
    </AppRouterContext.Provider>,
  );

  assert.match(html, /Write a post/);
  assert.match(html, /Share project feedback or report an issue/);
  assert.doesNotMatch(html, /Share what you observed/);
  assert.doesNotMatch(html, /href="\/projects"/);
  assert.doesNotMatch(html, /href="\/report-issue\/new"/);
  assert.doesNotMatch(html, /What would you like to share about this project/);
});
