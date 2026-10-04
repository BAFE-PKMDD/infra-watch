import assert from "node:assert/strict";
import { afterEach, mock, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CitizenGuideContext } from "./citizen-guide-context";
import { CITIZEN_PROJECT_ID } from "@/lib/tours/citizen";

const buttons: Array<{ label: ReactNode; click?: () => unknown; target?: string }> = [];
let contactSubmit: ((args: { value: { name: string; email: string; subject: string; message: string }; formApi: { reset: () => void } }) => Promise<void>) | undefined;
let contactDefaults: Record<string, string> = {};
let writes = 0;
let notifications = 0;
let completions = 0;
let callbackCalls = 0;
const originalFetch = globalThis.fetch;

mock.module("@/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
mock.module("@/lib/client-notifications", () => ({ dispatchClientNotification: () => { notifications++; } }));
mock.module("@/hooks/use-submission-survey-gate", () => ({ useSubmissionSurveyGate: () => ({ needsSurvey: true }) }));
mock.module("@/components/shared/submission-survey-modal", () => ({ SubmissionSurveyModal: () => null }));
mock.module("@/components/shared/geo-evidence-upload", () => ({ GeoEvidenceUpload: () => null }));
mock.module("@/components/contact/office-location-map-loader", () => ({ OfficeLocationMapLoader: () => null }));
mock.module("@/actions/mutation/contact.mutation", () => ({ createContactMessage: async () => { writes++; return { success: true }; } }));
mock.module("@/components/ui/button", () => ({ Button: (props: { children: ReactNode; onClick?: () => unknown; "data-citizen"?: string; disabled?: boolean }) => {
  buttons.push({ label: props.children, click: props.onClick, target: props["data-citizen"] });
  return <button data-citizen={props["data-citizen"]} disabled={props.disabled}>{props.children}</button>;
} }));
mock.module("@tanstack/react-form", () => ({ useForm: (options: { defaultValues: Record<string, string>; onSubmit: typeof contactSubmit }) => {
  contactSubmit = options.onSubmit;
  contactDefaults = options.defaultValues;
  return { Field: () => null, Subscribe: () => null, handleSubmit: () => {} };
} }));

const { FeedbackSubmissionForm } = await import("@/components/projects/feedback-submission-form");
const { default: ContactPage } = await import("@/app/(public)/contact/page");
afterEach(() => { globalThis.fetch = originalFetch; buttons.length = 0; writes = 0; notifications = 0; completions = 0; callbackCalls = 0; });

test("the actual feedback submit handler bypasses survey, API, notifications, and live success callbacks", async () => {
  globalThis.fetch = mock(async () => { writes++; throw new Error("No network write expected"); }) as typeof fetch;
  renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><CitizenGuideContext.Provider value={{
    session: { id: "attempt", guide: "citizen-feedback", returnTo: "/projects", submitted: false },
    loading: false, active: true, start: () => {}, overview: () => {}, submitted: () => { completions++; },
  }}><FeedbackSubmissionForm projectId={CITIZEN_PROJECT_ID} editMode initialData={{ id: "example", comment: "An example observation about the project.", category: "general", isAnonymous: false }} onSuccess={() => { callbackCalls++; }} /></CitizenGuideContext.Provider></QueryClientProvider>);
  const submit = buttons.find(({ label }) => label === "projectDetail.feedbackForm.review.submit");
  assert.ok(submit?.click);
  assert.equal(submit.target, "form-next", "the guide submit button must call the same safe form handler");
  await submit.click();
  assert.equal(completions, 1);
  assert.equal(writes, 0);
  assert.equal(notifications, 0);
  assert.equal(callbackCalls, 0);
});

test("the feedback form exposes an actual Next control to the guide", () => {
  const html = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><CitizenGuideContext.Provider value={{
    session: { id: "attempt", guide: "citizen-feedback", returnTo: "/projects", submitted: false },
    loading: false, active: true, start: () => {}, overview: () => {}, submitted: () => {},
  }}><FeedbackSubmissionForm projectId={CITIZEN_PROJECT_ID} /></CitizenGuideContext.Provider></QueryClientProvider>);
  assert.match(html, /data-citizen-step="feedback-sentiment"/);
  assert.match(html, /<button data-citizen="form-next">projectDetail.feedbackForm.next<\/button>/);
  assert.equal(buttons.filter(({ target }) => target === "form-next").length, 1);
});

test("expired example feedback cannot reach the API without an active guide", async () => {
  globalThis.fetch = mock(async () => { writes++; throw new Error("No network write expected"); }) as typeof fetch;
  renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><FeedbackSubmissionForm projectId={CITIZEN_PROJECT_ID} editMode initialData={{ id: "example", comment: "An example observation.", category: "general", isAnonymous: false }} /></QueryClientProvider>);
  await buttons.find(({ label }) => label === "projectDetail.feedbackForm.review.submit")!.click!();
  assert.equal(writes, 0);
  assert.equal(completions, 0);
});

test("the actual contact submit handler uses example identity and never calls the contact action", async () => {
  renderToStaticMarkup(<CitizenGuideContext.Provider value={{
    session: { id: "attempt", guide: "citizen-contact", returnTo: "/contact", submitted: false },
    loading: false, active: true, start: () => {}, overview: () => {}, submitted: () => { completions++; },
  }}><ContactPage /></CitizenGuideContext.Provider>);
  assert.equal(contactDefaults.email, "citizen@example.invalid");
  assert.ok(contactSubmit);
  await contactSubmit({ value: { name: "Example citizen", email: "citizen@example.invalid", subject: "Example", message: "Where can I find project updates?" }, formApi: { reset: () => { callbackCalls++; } } });
  assert.equal(completions, 1);
  assert.equal(writes, 0);
  assert.equal(callbackCalls, 0);
});

test("ordinary contact messages retain the normal server action", async () => {
  renderToStaticMarkup(<ContactPage />);
  assert.equal(contactDefaults.email, "");
  assert.ok(contactSubmit);
  await contactSubmit({ value: { name: "Citizen", email: "test@example.invalid", subject: "Question", message: "Where are project updates?" }, formApi: { reset: () => { callbackCalls++; } } });
  assert.equal(writes, 1);
  assert.equal(callbackCalls, 1);
  assert.equal(completions, 0);
});
