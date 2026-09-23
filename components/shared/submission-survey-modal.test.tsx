import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SubmissionSurveyForm } from "./submission-survey-modal";

test("SubmissionSurveyForm renders all 4 required fields and options", () => {
  const html = renderToStaticMarkup(
    <SubmissionSurveyForm
      sourceType="feedback"
      defaultName="Maria Clara"
    />
  );

  // 1. Name (optional)
  assert.match(html, /1\.\s*Name/);
  assert.match(html, /optional/i);

  // 2. Age
  assert.match(html, /2\.\s*Age/);

  // 3. Gender
  assert.match(html, /3\.\s*Gender/);
  assert.match(html, /Female/);
  assert.match(html, /Male/);

  // 4. How did you find out about us?
  assert.match(html, /4\.\s*How did you find out about us\?/);
  // a. Facebook
  assert.match(html, /a\.\s*Facebook/);
  // b. Website
  assert.match(html, /b\.\s*Website/);
  // c. Instagram
  assert.match(html, /c\.\s*Instagram/);

  // Buttons
  assert.match(html, /Skip/);
  assert.match(html, /Submit Survey/);
});

test("SubmissionSurveyForm displays E-Report context when sourceType is e_report", () => {
  const html = renderToStaticMarkup(
    <SubmissionSurveyForm
      sourceType="e_report"
    />
  );

  assert.match(html, /E-Report Submitted/i);
});
