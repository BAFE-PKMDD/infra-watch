import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import DataDeletionPage from "./data-deletion/page";
import DataPrivacyPage from "./data-privacy/page";
import FaqPage from "./faq/page";
import TermsOfServicePage from "./terms-of-service/page";

const pages = [
  { name: "FAQ", component: FaqPage, expected: "Frequently Asked Questions" },
  { name: "Terms of Service", component: TermsOfServicePage, expected: "Terms of Service" },
  { name: "Data Privacy", component: DataPrivacyPage, expected: "Privacy Notice" },
  { name: "Data Deletion", component: DataDeletionPage, expected: "Request Data Deletion" },
];

for (const page of pages) {
  test(`${page.name} public information page renders`, () => {
    const html = renderToStaticMarkup(page.component());
    assert.match(html, new RegExp(page.expected));
    assert.match(html, /InfraWatch/);
  });
}
