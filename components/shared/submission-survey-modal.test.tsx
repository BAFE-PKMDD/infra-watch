import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SubmissionSurveyForm } from "./submission-survey-modal";

test("SubmissionSurveyForm renders all 5 required fields and options", () => {
  const html = renderToStaticMarkup(
    <SubmissionSurveyForm
      sourceType="feedback"
      defaultName="Maria Clara"
    />
  );

  // 1. Respondent type
  assert.match(html, /1\.\s*You are a:/);
  assert.match(html, /Farmer/);
  assert.match(html, /Normal Citizen/);
  assert.match(html, /Student/);
  assert.match(html, /BAFE Employee/);
  assert.match(html, /RAED Staff/);

  // 2. Name (optional)
  assert.match(html, /2\.\s*Name/);
  assert.match(html, /optional/i);

  // 3. Age
  assert.match(html, /3\.\s*Age/);

  // 4. Gender
  assert.match(html, /4\.\s*Gender/);
  assert.match(html, /Female/);
  assert.match(html, /Male/);

  // 5. How did you find out about us?
  assert.match(html, /5\.\s*How did you find out about us\?/);
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

test("SubmissionSurveyForm frames the question as happening before submission, for both source types", () => {
  const feedbackHtml = renderToStaticMarkup(<SubmissionSurveyForm sourceType="feedback" />);
  assert.match(feedbackHtml, /Before You Submit/i);
  assert.match(feedbackHtml, /send your feedback/i);
  assert.doesNotMatch(feedbackHtml, /Submitted/);

  const ereportHtml = renderToStaticMarkup(<SubmissionSurveyForm sourceType="e_report" />);
  assert.match(ereportHtml, /Before You Submit/i);
  assert.match(ereportHtml, /send your e-report/i);
  assert.doesNotMatch(ereportHtml, /Submitted/);
});
