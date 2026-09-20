import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ReportingMethods } from "./reporting-methods";

test("reporting methods preserve the online report and link to SMS instructions", () => {
  const html = renderToStaticMarkup(<ReportingMethods />);

  assert.match(html, /How to report/);
  assert.match(html, /Submit an Online E-Report/);
  assert.match(html, /href="\/report-issue\/new"/);
  assert.match(html, /Send an SMS Grievance/);
  assert.match(html, /href="\/report-issue\/sms"/);
  assert.doesNotMatch(html, /Send now/);
});
