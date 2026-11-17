import { sendEmail } from "@/lib/email";
import { getEmailTemplateContent } from "@/lib/email-templates";
import { renderEmailTemplate } from "@/lib/email-template-registry";
import { codeBoxHtml, paragraphsToHtml, wrapEmailHtml } from "@/lib/email-layout";

type SendEmail = typeof sendEmail;

const SUBJECT_BY_TYPE: Record<string, string> = {
  "sign-in": "Your INFRA Watch sign-in code",
  "email-verification": "Verify your INFRA Watch email",
  "forget-password": "Your INFRA Watch password reset code",
};

export async function deliverAuthCode(
  input: { email: string; otp: string; type: string; expiresInSeconds: number },
  send: SendEmail = sendEmail,
  loadTemplate: typeof getEmailTemplateContent = getEmailTemplateContent,
) {
  const minutes = Math.max(1, Math.round(input.expiresInSeconds / 60));
  const slug = { "sign-in": "otp-sign-in", "email-verification": "otp-email-verification", "forget-password": "otp-forget-password" }[input.type];
  // A template lookup failure must not strand sign-in; fall back to the built-in message.
  const template = slug ? await loadTemplate(slug).catch(() => null) : null;
  if (template && !template.isActive) throw new Error("The verification email could not be sent. Its template is disabled.");
  const result = await send({
    to: input.email,
    ...(template ? renderEmailTemplate(template, { otp: input.otp, recipientEmail: input.email, expiryMinutes: String(minutes) }) : {
    subject: SUBJECT_BY_TYPE[input.type] ?? "Your INFRA Watch verification code",
    text: [
      `Your INFRA Watch code is ${input.otp}.`,
      `It expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      "If you did not request this code, ignore this email.",
    ].join("\n\n"),
    html: wrapEmailHtml({
      preheader: `Your code is ${input.otp}`,
      bodyHtml:
        codeBoxHtml(input.otp, `Expires in ${minutes} minute${minutes === 1 ? "" : "s"}`) +
        paragraphsToHtml("Never share this code with anyone. INFRA Watch staff will never ask for it.\n\nIf you did not request this code, you can ignore this email."),
    }),
    }),
  });

  // Sign-up and password reset depend on this code, so a silent failure would strand the user.
  if (!result.success) {
    throw new Error("The verification email could not be sent.");
  }
}
