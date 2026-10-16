import assert from "node:assert/strict";
import { test } from "bun:test";
import { getDefaultEmailTemplate } from "./email-template-registry";
import { sendTemplatedEmail } from "./email-templates";

test("contact receipts use configured content without treating user text as template placeholders", async () => {
  let email: { text: string; subject: string } | null = null;
  const result = await sendTemplatedEmail(
    "contact-auto-reply",
    "sample@example.invalid",
    {
      recipientName: "[Sample]",
      originalSubject: "Suggestion: support {{custom}} placeholders",
    },
    {
      loadTemplate: async (slug) => ({
        ...getDefaultEmailTemplate(slug),
        subject: "Custom receipt: {{originalSubject}}",
      }),
      send: async (input) => {
        email = input;
        return { success: true };
      },
    },
  );
  assert.equal(result.success, true);
  assert.match(
    (email as { subject: string } | null)?.subject ?? "",
    /Custom receipt/,
  );
  assert.match((email as { text: string } | null)?.text ?? "", /{{custom}}/);
});

test("disabled templates and missing response variables never reach the mail transport", async () => {
  let calls = 0;
  const send = async () => {
    calls++;
    return { success: true };
  };
  assert.equal(
    (
      await sendTemplatedEmail(
        "contact-response",
        "sample@example.invalid",
        {},
        {
          send,
          loadTemplate: async (slug) => ({
            ...getDefaultEmailTemplate(slug),
            isActive: false,
          }),
        },
      )
    ).success,
    false,
  );
  assert.equal(
    (
      await sendTemplatedEmail(
        "contact-response",
        "sample@example.invalid",
        {},
        { send, loadTemplate: async (slug) => getDefaultEmailTemplate(slug) },
      )
    ).success,
    false,
  );
  assert.equal(calls, 0);
});
