import { sendEmail } from "@/lib/email";

type SendEmail = typeof sendEmail;

const SUBJECT_BY_TYPE: Record<string, string> = {
  "sign-in": "Your INFRA Watch sign-in code",
  "email-verification": "Verify your INFRA Watch email",
  "forget-password": "Your INFRA Watch password reset code",
};

export async function deliverAuthCode(
  input: { email: string; otp: string; type: string; expiresInSeconds: number },
  send: SendEmail = sendEmail,
) {
  const minutes = Math.max(1, Math.round(input.expiresInSeconds / 60));
  const result = await send({
    to: input.email,
    subject: SUBJECT_BY_TYPE[input.type] ?? "Your INFRA Watch verification code",
    text: [
      `Your INFRA Watch code is ${input.otp}.`,
      `It expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      "If you did not request this code, ignore this email.",
    ].join("\n\n"),
  });

  // Sign-up and password reset depend on this code, so a silent failure would strand the user.
  if (!result.success) {
    throw new Error("The verification email could not be sent.");
  }
}
