import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AiMessageContent } from "./ai-message-content";

test("renders non-project Markdown links as inert text", () => {
  const html = renderToStaticMarkup(
    createElement(AiMessageContent, {
      content: "[Official project portal](https://evil.example/phishing)",
    }),
  );

  assert.match(html, /Official project portal/);
  assert.doesNotMatch(html, /href=/);
});
