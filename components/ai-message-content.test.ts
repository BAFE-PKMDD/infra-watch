import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { AiMessageContent } from "./ai-message-content";
import { LanguageProvider } from "@/providers/language-provider";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;

// The interface labels around an answer read useTranslation, so render inside the language
// provider the site wraps pages in (English until a visitor picks Tagalog).
function renderToStaticMarkup(element: ReactElement) {
  return renderMarkup(
    createElement(AppRouterContext.Provider, { value: router }, createElement(LanguageProvider, null, element)),
  );
}

test("renders linked project IDs with one valid anchor", () => {
  const id = "2021-R4B-PAL-INFRA-NRP-IC-00424";
  const html = renderToStaticMarkup(
    createElement(AiMessageContent, {
      content: "[`" + id + "`](/projects/" + id + ")",
    }),
  );

  assert.equal(html.match(/<a\b/g)?.length, 1);
  assert.equal(html.match(new RegExp(`href="/projects/${id}"`, "g"))?.length, 1);
  assert.doesNotMatch(html, /<a\b[^>]*>[^]*<a\b/);
});

test("auto-links a bare inline project ID without nesting anchors", () => {
  const id = "2021-R4B-PAL-INFRA-NRP-IC-00424";
  const html = renderToStaticMarkup(
    createElement(AiMessageContent, { content: "`" + id + "`" }),
  );

  assert.equal(html.match(/<a\b/g)?.length, 1);
  assert.equal(html.match(new RegExp(`href="/projects/${id}"`, "g"))?.length, 1);
  assert.match(html, /<code/);
});

test("renders non-project Markdown links as inert text", () => {
  const html = renderToStaticMarkup(
    createElement(AiMessageContent, {
      content: "[Official project portal](https://evil.example/phishing)",
    }),
  );

  assert.match(html, /Official project portal/);
  assert.match(html, /title="External link omitted"/);
  assert.doesNotMatch(html, /href=/);
});
