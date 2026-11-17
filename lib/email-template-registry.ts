import { codeBoxHtml, paragraphsToHtml, wrapEmailHtml } from "@/lib/email-layout";

export type EmailTemplateDefinition = {
  slug: string;
  name: string;
  description: string;
  category: "contact" | "system";
  variables: string[];
  requiredVariables: string[];
  defaultSubject: string;
  defaultBody: string;
  sampleProps: Record<string, string>;
};

export const EMAIL_TEMPLATE_REGISTRY: EmailTemplateDefinition[] = [
  {
    slug: "contact-response",
    name: "Contact Response",
    category: "contact",
    description: "Staff replies to contact messages and suggestions.",
    variables: [
      "recipientName",
      "originalSubject",
      "originalMessage",
      "adminResponse",
    ],
    requiredVariables: ["adminResponse"],
    defaultSubject: "Response to your inquiry: {{originalSubject}}",
    defaultBody:
      "Hello {{recipientName}},\n\n{{adminResponse}}\n\nYour original message: {{originalMessage}}\n\nINFRA Watch, Bureau of Agricultural and Fisheries Engineering",
    sampleProps: {
      recipientName: "[Sample recipient]",
      originalSubject: "[Sample subject]",
      originalMessage: "[Sample message]",
      adminResponse: "[Sample staff response]",
    },
  },
  ...[
    {
      slug: "otp-email-verification",
      name: "OTP - Email Verification",
      subject: "Verify your INFRA Watch email",
      purpose: "Use this code to verify your email address.",
    },
    {
      slug: "otp-sign-in",
      name: "OTP - Sign In",
      subject: "Your INFRA Watch sign-in code",
      purpose: "Use this code to sign in to INFRA Watch.",
    },
    {
      slug: "otp-forget-password",
      name: "OTP - Password Reset",
      subject: "Your INFRA Watch password reset code",
      purpose: "Use this code to reset your INFRA Watch password.",
    },
  ].map((template) => ({
    slug: template.slug,
    name: template.name,
    category: "system" as const,
    description:
      "Authentication code email. The code placeholder must remain in the body.",
    variables: ["otp", "recipientEmail", "expiryMinutes"],
    requiredVariables: ["otp"],
    defaultSubject: template.subject,
    defaultBody:
      `${template.purpose}

Your code is {{otp}}. It expires in {{expiryMinutes}} minutes.

Never share this code with anyone. INFRA Watch staff will never ask for it.

If you did not request this code, you can ignore this email.`,
    sampleProps: {
      otp: "123456",
      recipientEmail: "sample@example.invalid",
      expiryMinutes: "3",
    },
  })),
  {
    slug: "contact-auto-reply",
    name: "Contact - Auto Reply",
    category: "contact",
    description:
      "Acknowledgment after a contact message or suggestion is saved.",
    variables: ["recipientName", "originalSubject"],
    requiredVariables: [],
    defaultSubject: "We've received your message",
    defaultBody:
      'Hello {{recipientName}},\n\nThank you for contacting INFRA Watch. We have received your message about "{{originalSubject}}". Staff will review your submission.\n\nBureau of Agricultural and Fisheries Engineering',
    sampleProps: {
      recipientName: "[Sample recipient]",
      originalSubject: "[Sample subject]",
    },
  },
];

export type ResolvedEmailTemplate = EmailTemplateDefinition & {
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt?: Date | null;
};

export function getTemplateBySlug(slug: string) {
  return EMAIL_TEMPLATE_REGISTRY.find((template) => template.slug === slug);
}

export function getDefaultEmailTemplate(slug: string): ResolvedEmailTemplate {
  const definition = getTemplateBySlug(slug);
  if (!definition) throw new Error("Email template not found");
  return {
    ...definition,
    subject: definition.defaultSubject,
    body: definition.defaultBody,
    isActive: true,
  };
}

export function validateTemplateVariables(
  template: EmailTemplateDefinition,
  subject: string,
  body: string,
) {
  const variables = [
    ...`${subject}\n${body}`.matchAll(/{{\s*([\w]+)\s*}}/g),
  ].map((match) => match[1]);
  const unknown = variables.filter(
    (variable) => !template.variables.includes(variable),
  );
  if (unknown.length)
    throw new Error(`Unknown variables: ${[...new Set(unknown)].join(", ")}`);
  for (const variable of template.requiredVariables) {
    if (!new RegExp(`{{\\s*${variable}\\s*}}`).test(body))
      throw new Error(`Keep {{${variable}}} in the email body`);
  }
}

export function replaceTemplateVariables(
  text: string,
  values: Record<string, string>,
) {
  return text.replace(
    /{{\s*([\w]+)\s*}}/g,
    (_, key: string) => values[key] ?? `{{${key}}}`,
  );
}

export function renderEmailTemplate(
  template: Pick<ResolvedEmailTemplate, "subject" | "body">,
  values: Record<string, string>,
) {
  const subject = replaceTemplateVariables(template.subject, values).replace(
    /[\r\n]+/g,
    " ",
  );
  const text = replaceTemplateVariables(template.body, values);
  // One-time code emails get the code in a large box, using the minutes the caller supplied.
  const code = values.otp?.trim();
  const minutes = values.expiryMinutes?.trim();
  // The box already shows the code and the expiry, so a short line that only repeats the code
  // is left out of the visual version. The plain-text version keeps the full body.
  // The layout adds its own "Best regards" sign-off, so a closing line that only names the
  // bureau is dropped from the visual version to avoid saying it twice.
  const withoutSignature = text
    .split(/\n\s*\n/)
    .filter((paragraph, index, all) => !(index === all.length - 1 && /^(INFRA Watch,\s*)?Bureau of Agricultural and Fisheries Engineering\.?$/i.test(paragraph.trim())))
    .join("\n\n");
  const visualText = code
    ? withoutSignature
        .split(/\n\s*\n/)
        .filter((paragraph) => !(paragraph.includes(code) && paragraph.length < 120))
        .join("\n\n")
    : withoutSignature;
  const bodyHtml = code
    ? codeBoxHtml(code, minutes ? `Expires in ${minutes} minute${minutes === "1" ? "" : "s"}` : undefined) +
      paragraphsToHtml(visualText)
    : paragraphsToHtml(withoutSignature);
  const html = wrapEmailHtml({ bodyHtml, preheader: code ? `Your code is ${code}` : subject });
  return { subject, text, html };
}
