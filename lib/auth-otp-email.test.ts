import assert from "node:assert/strict";
import test from "node:test";

import { deliverAuthCode } from "./auth-otp-email";

type SentEmail = { to: string | string[]; subject: string; text: string };

test("sends the code to the requesting address with a type-specific subject", async () => {
  const sent: SentEmail[] = [];
  await deliverAuthCode(
    { email: "citizen@example.com", otp: "482913", type: "forget-password", expiresInSeconds: 180 },
    async (email) => {
      sent.push(email);
      return { success: true, messageId: "test" };
    },
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
    ),
    /could not be sent/,
  );
});
