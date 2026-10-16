import assert from "node:assert/strict";
import test from "node:test";

import { deliverAuthCode } from "./auth-otp-email";
import { getDefaultEmailTemplate } from "./email-template-registry";

const loadTemplate = async (slug: string) => ({ ...getDefaultEmailTemplate(slug), updatedAt: null });

type SentEmail = { to: string | string[]; subject: string; text: string };

test("sends the code to the requesting address with a type-specific subject", async () => {
  const sent: SentEmail[] = [];
  await deliverAuthCode(
    { email: "citizen@example.com", otp: "482913", type: "forget-password", expiresInSeconds: 180 },
    async (email) => {
      sent.push(email);
      return { success: true, messageId: "test" };
    },
    loadTemplate,
  );

  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.to, "citizen@example.com");
  assert.equal(sent[0]?.subject, "Your INFRA Watch password reset code");
  assert.match(sent[0]?.text ?? "", /482913/);
  assert.match(sent[0]?.text ?? "", /expires in 3 minutes/);
});

test("fails loudly when the mail transport rejects the message", async () => {
  await assert.rejects(
    deliverAuthCode(
      { email: "citizen@example.com", otp: "482913", type: "sign-in", expiresInSeconds: 180 },
      async () => ({ success: false, error: "Email configuration missing" }),
      loadTemplate,
    ),
    /could not be sent/,
  );
});

test("saved code templates affect delivery and disabling a template prevents sending", async () => {
  const input = { email: "citizen@example.invalid", otp: "482913", type: "sign-in", expiresInSeconds: 180 };
  let sent: SentEmail | null = null;
  await deliverAuthCode(input, async email => { sent = email; return { success: true }; }, async slug => ({ ...await loadTemplate(slug), subject: "Customized INFRA Watch code", body: "Code: {{otp}}; expires in {{expiryMinutes}} minutes" }));
  assert.equal((sent as SentEmail | null)?.subject, "Customized INFRA Watch code");
  assert.match((sent as SentEmail | null)?.text ?? "", /482913/);
  let calls = 0;
  await assert.rejects(deliverAuthCode(input, async () => { calls++; return { success: true }; }, async slug => ({ ...await loadTemplate(slug), isActive: false })), /disabled/);
  assert.equal(calls, 0);
});

test("falls back to the built-in message when the template lookup fails", async () => {
  let sent: SentEmail | null = null;
  await deliverAuthCode(
    { email: "citizen@example.invalid", otp: "482913", type: "sign-in", expiresInSeconds: 180 },
    async email => { sent = email; return { success: true }; },
    async () => { throw new Error("relation \"email_templates\" does not exist"); },
  );
  assert.equal((sent as SentEmail | null)?.subject, "Your INFRA Watch sign-in code");
  assert.match((sent as SentEmail | null)?.text ?? "", /482913/);
});
