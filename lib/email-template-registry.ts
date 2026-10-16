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
    },
    {
      slug: "otp-sign-in",
      name: "OTP - Sign In",
      subject: "Your INFRA Watch sign-in code",
    },
    {
      slug: "otp-forget-password",
      name: "OTP - Password Reset",
      subject: "Your INFRA Watch password reset code",
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
      "Your INFRA Watch code is {{otp}}.\n\nIt expires in {{expiryMinutes}} minutes.\n\nIf you did not request this code, ignore this email.",
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
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  const html = `<div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#172033"><h1 style="font-size:20px">INFRA Watch</h1>${text
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        `<p style="font-size:16px;line-height:1.6">${escape(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("")}</div>`;
  return { subject, text, html };
}
