import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DataDeletionView } from "./data-deletion/data-deletion-view";
import { DataPrivacyView } from "./data-privacy/data-privacy-view";
import { FaqView } from "./faq/faq-view";
import { TermsOfServiceView } from "./terms-of-service/terms-of-service-view";
import { FAQ_ENTRIES, FAQ_ENTRIES_TL } from "@/lib/faq-content";

// The routes themselves read the language cookie (server-only), so tests render their views.
const FaqPage = () => <FaqView language="en" />;
const TermsOfServicePage = () => <TermsOfServiceView language="en" />;
const DataPrivacyPage = () => <DataPrivacyView language="en" />;
const DataDeletionPage = () => <DataDeletionView language="en" />;

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

test("FAQ shows every question as a collapsed accordion item", () => {
  const html = renderToStaticMarkup(FaqPage());
  const items = html.match(/<details/g) ?? [];
  assert.equal(items.length, FAQ_ENTRIES.length);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /<summary[^>]*><h2[^>]*>What is InfraWatch\?<\/h2>/);
});

test("Tagalog FAQ has one entry per English entry and keeps links and contact details", () => {
  assert.equal(FAQ_ENTRIES_TL.length, FAQ_ENTRIES.length);
  const details = /\/[a-z-]+(?:\/[a-z-]+)*|[\w.]+@[\w.]+\.[a-z]+|\d{4}-\d{3}-\d{4}/g;
  FAQ_ENTRIES.forEach((entry, index) => {
    const tagalog = FAQ_ENTRIES_TL[index];
    assert.ok(tagalog.question.trim() && tagalog.answer.trim(), `entry ${index} is empty`);
    assert.notEqual(tagalog.question, entry.question, `entry ${index} is not translated`);
    for (const detail of entry.answer.match(details) ?? []) {
      assert.ok(tagalog.answer.includes(detail), `entry ${index} is missing ${detail}`);
    }
  });
});

test("Tagalog FAQ page renders the Tagalog heading, chrome and every question", () => {
  const html = renderToStaticMarkup(<FaqView language="tl" />);
  assert.match(html, /Mga Madalas Itanong/);
  assert.match(html, /Bumalik sa Home/);
  assert.equal((html.match(/<details/g) ?? []).length, FAQ_ENTRIES_TL.length);
  assert.match(html, /<summary[^>]*><h2[^>]*>Ano ang InfraWatch\?<\/h2>/);
});

test("legal pages show Tagalog chrome but keep the legal text in English", () => {
  for (const [View, heading] of [
    [TermsOfServiceView, "Terms of Service"],
    [DataPrivacyView, "Privacy Notice"],
    [DataDeletionView, "Request Data Deletion"],
  ] as const) {
    const html = renderToStaticMarkup(<View language="tl" />);
    assert.match(html, new RegExp(heading));
    assert.match(html, /Bumalik sa Home/);
    assert.match(html, /Kontakin ang InfraWatch/);
    assert.doesNotMatch(html, /Return home/);
    assert.match(html, /Nasa English muna ang page na ito/);
    assert.doesNotMatch(renderToStaticMarkup(<View language="en" />), /Nasa English muna/);
  }
});
