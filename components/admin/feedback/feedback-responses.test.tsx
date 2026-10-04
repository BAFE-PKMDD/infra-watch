import assert from "node:assert/strict";
import { mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TutorialSandboxContext } from "@/components/admin/tour/tutorial-sandbox";
import { applySandboxAction, createTutorialSandbox, TUTORIAL_FEEDBACK_ID } from "@/lib/tours/sandbox";

mock.module("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "staff-a", name: "Staff account", image: null } }) }));
mock.module("@/i18n", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
mock.module("@/actions/query/feedback-comments.query", () => ({ getFeedbackComments: async () => ({ success: true, data: [] }) }));
mock.module("@/actions/mutation/feedback-comment.mutation", () => ({ createFeedbackComment: async () => { throw new Error("Rendering must not post a real comment."); } }));

const { FeedbackResponses } = await import("./feedback-responses");
const { FeedbackManagementView } = await import("./feedback-management-view");

test("the actual feedback list exposes Respond for the lesson's approved example", () => {
  const state = createTutorialSandbox("attempt", "feedback-reply");
  const html = renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><TutorialSandboxContext.Provider value={{ state, apply: () => {} }}><FeedbackManagementView initialData={{
    feedbacks: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    stats: { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0, positiveSentiment: 0, negativeSentiment: 0 },
  }} /></TutorialSandboxContext.Provider></QueryClientProvider>);
  assert.match(html, /data-tour="feedback-respond"/);
  assert.match(html, /data-tour-status="approved"/);
  assert.match(html, /data-tour="feedback-delete"[^>]*disabled/);
});

test("Feedback practice reuses the comment field and shows only simulated replies", () => {
  const state = applySandboxAction(createTutorialSandbox("attempt", "feedback-reply"), { resource: "feedback", recordId: TUTORIAL_FEEDBACK_ID, action: "reply", body: "Example inspection requested." });
  const client = new QueryClient();
  client.setQueryData(["admin-feedback-responses", TUTORIAL_FEEDBACK_ID], { success: true, data: [{ ...state.feedbackComments[0], comment: "Real cached reply" }] });
  const html = renderToStaticMarkup(<QueryClientProvider client={client}><TutorialSandboxContext.Provider value={{ state, apply: () => {} }}><FeedbackResponses feedbackId={TUTORIAL_FEEDBACK_ID} /></TutorialSandboxContext.Provider></QueryClientProvider>);
  assert.match(html, /data-tour="feedback-reply-input"/);
  assert.match(html, /data-tour="feedback-reply-send"/);
  assert.match(html, /Post reply/);
  assert.match(html, /data-tour="feedback-reply-history"/);
  assert.match(html, /Example inspection requested/);
  assert.doesNotMatch(html, /Real cached reply/);
  const uploads = html.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
  assert.equal(uploads.length, 2);
  for (const upload of uploads) assert.match(upload, /disabled/);
});

test("expired examples have no reply form while normal feedback retains its comment form", () => {
  const render = (feedbackId: string) => renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><FeedbackResponses feedbackId={feedbackId} /></QueryClientProvider>);
  assert.match(render(TUTORIAL_FEEDBACK_ID), /guide has ended/);
  assert.doesNotMatch(render(TUTORIAL_FEEDBACK_ID), /<textarea/);
  assert.match(render("real-feedback"), /data-tour="feedback-reply-send"/);
  assert.doesNotMatch(render("real-feedback"), /type="file"[^>]*disabled/);
});
