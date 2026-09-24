import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { IssueTypePicker } from "./issue-type-picker";
import { splitIssueTypesByFarmOperation } from "@/lib/abemis/issue-type-map";

function extractGroup(html: string): string {
  const start = html.indexOf('data-testid="recommended-issue-types"');
  assert.ok(start >= 0, "expected the recommended issue types grid in the rendered markup");
  const end = html.indexOf('data-testid="more-issue-types"');
  return html.slice(start, end >= 0 ? end : undefined);
}

test("the recommended card grid only contains types tagged for the selected farm operation", () => {
  const html = renderToStaticMarkup(
    <IssueTypePicker value="" farmOperation="Irrigation System" onChange={() => {}} />,
  );
  const group = extractGroup(html);

  assert.match(html, /Common for Irrigation System/);
  assert.match(group, /Water Leak or Seepage/);
  assert.match(group, /Gate, Valve, or Pump Malfunction/);
  assert.doesNotMatch(group, /Pavement Damage or Potholes/);
});

test("falls back to a generic eyebrow and only common cards in the recommended grid when no farm operation is set", () => {
  const html = renderToStaticMarkup(<IssueTypePicker value="" farmOperation="" onChange={() => {}} />);
  const group = extractGroup(html);

  assert.match(html, /Common issue types/);
  assert.match(group, /Safety Hazard/);
  assert.doesNotMatch(group, /Water Leak or Seepage/);
});

test("the recommended grid contains exactly the operation's recommended types, and the rest sit behind browse-all", () => {
  const { recommended, more } = splitIssueTypesByFarmOperation("Irrigation System");
  const html = renderToStaticMarkup(
    <IssueTypePicker value="" farmOperation="Irrigation System" onChange={() => {}} />,
  );
  const group = extractGroup(html);

  for (const type of recommended) {
    assert.match(group, new RegExp(type.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.ok(more.length > 0, "test assumes Irrigation System has non-recommended types to browse");
  assert.match(html, /Browse all issue types/);
});

test("multiple selections all render as pressed and are listed in the selection summary", () => {
  const html = renderToStaticMarkup(
    <IssueTypePicker
      value="Safety Hazard | Water Leak or Seepage"
      farmOperation="Irrigation System"
      onChange={() => {}}
    />,
  );

  assert.match(html, /2 selected: Safety Hazard, Water Leak or Seepage/);
  const safetyButton = html.match(
    /<button[^>]*aria-pressed="(true|false)"[^>]*>(?:(?!<button)[\s\S])*Safety Hazard/,
  );
  const leakButton = html.match(
    /<button[^>]*aria-pressed="(true|false)"[^>]*>(?:(?!<button)[\s\S])*Water Leak or Seepage/,
  );
  assert.equal(safetyButton?.[1], "true");
  assert.equal(leakButton?.[1], "true");
});

test("no selection summary is rendered when nothing is selected", () => {
  const html = renderToStaticMarkup(<IssueTypePicker value="" farmOperation="" onChange={() => {}} />);
  assert.doesNotMatch(html, /selected:/);
});

test("the browse-all disclosure is open when a selection only exists outside the recommended set", () => {
  const openHtml = renderToStaticMarkup(
    <IssueTypePicker value="Pavement Damage or Potholes" farmOperation="Irrigation System" onChange={() => {}} />,
  );
  assert.match(openHtml, /<details[^>]*\bopen\b/);

  const closedHtml = renderToStaticMarkup(
    <IssueTypePicker value="Water Leak or Seepage" farmOperation="Irrigation System" onChange={() => {}} />,
  );
  assert.doesNotMatch(closedHtml, /<details[^>]*\bopen\b/);
});

test("the disclosure stays open when at least one of several selections is outside the recommended set", () => {
  const html = renderToStaticMarkup(
    <IssueTypePicker
      value="Water Leak or Seepage | Pavement Damage or Potholes"
      farmOperation="Irrigation System"
      onChange={() => {}}
    />,
  );
  assert.match(html, /<details[^>]*\bopen\b/);
});
