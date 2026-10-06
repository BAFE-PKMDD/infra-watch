import assert from "node:assert/strict";
import { test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SmsGrievanceTable } from "@/components/admin/issues/sms-grievance-table";
import { SmsGrievanceDetailView } from "@/components/admin/issues/sms-grievance-detail-view";
import { ContactMessageList } from "@/components/admin/contact-messages/contact-message-list";
import { TutorialSandboxContext } from "./tutorial-sandbox";
import { createTutorialSms } from "@/lib/tours/sms-sandbox";
import { createTutorialSandbox } from "@/lib/tours/sandbox";

test("SMS lesson reuses the actual list and reply controls without real-send or restore controls", () => {
  const record = createTutorialSms();
  const html = renderToStaticMarkup(<SmsGrievanceTable tutorial initialRecords={[record]} />);
  assert.match(html, /data-tour="sms-row"/);
  assert.match(html, /data-tour="sms-open"/);
  assert.match(html, /\/learn\/sms-grievances\/tutorial-example-sms/);
  assert.doesNotMatch(html, /Simulate incoming message|Restore sample messages|\/issues\/sms-review/);
  const detail = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><SmsGrievanceDetailView tutorial initialRecords={[record]} id={record.id} /></QueryClientProvider>);
  for (const anchor of ["sms-detail", "sms-reply-box", "sms-send", "sms-history"]) assert.ok(detail.includes(`data-tour="${anchor}"`));
  assert.match(detail, /id="simulated-response"/);
  assert.match(detail, /No SMS will be sent/);
});

test("contact lesson replaces real messages and external email links with an isolated example", () => {
  const state = createTutorialSandbox("contact-attempt");
  const initialResult = { data: [{ ...state.contact, id: "real-contact", email: "real@example.com", message: "Real contact content" }], status: null, page: 1, pageSize: 25, total: 1, totalPages: 1, counts: { new: 1, in_progress: 0, resolved: 0 } };
  const normal = renderToStaticMarkup(<ContactMessageList initialResult={initialResult} />);
  assert.match(normal, /mailto:real@example.com/);
  assert.match(normal, /Real contact content/);
  const tutorial = renderToStaticMarkup(<TutorialSandboxContext.Provider value={{ state, apply: () => {} }}><ContactMessageList initialResult={initialResult} /></TutorialSandboxContext.Provider>);
  assert.match(tutorial, /data-tour="contact-row"/);
  assert.match(tutorial, /data-tour="contact-email"/);
  assert.match(tutorial, /data-tour="contact-status"/);
  assert.match(tutorial, /href="#contact-email-preview"/);
  assert.doesNotMatch(tutorial, /mailto:|Real contact content|real@example.com/);
});
