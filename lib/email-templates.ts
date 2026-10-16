import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import {
  getDefaultEmailTemplate,
  renderEmailTemplate,
  type ResolvedEmailTemplate,
} from "@/lib/email-template-registry";

export async function getEmailTemplateContent(
  slug: string,
): Promise<ResolvedEmailTemplate> {
  const template = getDefaultEmailTemplate(slug);
  const [stored] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.slug, slug))
    .limit(1);
  return {
    ...template,
    subject: stored?.subject ?? template.subject,
    body: stored?.body ?? template.body,
    isActive: stored?.isActive ?? true,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export async function sendTemplatedEmail(
  slug: string,
  to: string,
  values: Record<string, string>,
  dependencies: {
    loadTemplate?: typeof getEmailTemplateContent;
    send?: typeof sendEmail;
  } = {},
) {
  const template = await (dependencies.loadTemplate ?? getEmailTemplateContent)(
    slug,
  );
  if (!template.isActive)
    return { success: false as const, error: "Email template is disabled" };
  const requiredValues = [
    ...`${template.subject}\n${template.body}`.matchAll(/{{\s*(\w+)\s*}}/g),
  ].map((match) => match[1]);
  if (requiredValues.some((key) => !(key in values)))
    return {
      success: false as const,
      error: "Required template values are missing",
    };
  const rendered = renderEmailTemplate(template, values);
  return (dependencies.send ?? sendEmail)({ to, ...rendered });
}
