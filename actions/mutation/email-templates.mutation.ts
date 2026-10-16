"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import {
  EMAIL_TEMPLATE_REGISTRY,
  getDefaultEmailTemplate,
  getTemplateBySlug,
  validateTemplateVariables,
} from "@/lib/email-template-registry";
import { getAuditContextFromServerAction, logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/session";

export async function getManagedEmailTemplates() {
  await requireAdmin();
  const stored = await db.select().from(emailTemplates);
  return EMAIL_TEMPLATE_REGISTRY.map((definition) => {
    const saved = stored.find((template) => template.slug === definition.slug);
    return {
      ...getDefaultEmailTemplate(definition.slug),
      subject: saved?.subject ?? definition.defaultSubject,
      body: saved?.body ?? definition.defaultBody,
      isActive: saved?.isActive ?? true,
      updatedAt: saved?.updatedAt ?? null,
    };
  });
}

export async function updateEmailTemplate(slug: string, input: unknown) {
  try {
    const user = await requireAdmin();
    const template = getTemplateBySlug(slug);
    if (!template) throw new Error("Email template not found");
    const data = z
      .object({
        subject: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .refine((value) => !/[\r\n]/.test(value), "Subject must be one line"),
        body: z.string().trim().min(1).max(20000),
        isActive: z.boolean(),
      })
      .parse(input);
    validateTemplateVariables(template, data.subject, data.body);
    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.slug, slug))
      .limit(1);
    const [saved] = await db
      .insert(emailTemplates)
      .values({
        slug,
        name: template.name,
        description: template.description,
        category: template.category,
        variables: template.variables,
        ...data,
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    await logAudit({
      tableName: "email_templates",
      recordId: saved.id,
      action: existing ? "UPDATE" : "CREATE",
      oldValues: existing,
      newValues: saved,
      context: await getAuditContextFromServerAction(user),
    });
    revalidatePath("/email-templates");
    revalidatePath(`/email-templates/${slug}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not save template",
    };
  }
}

export async function resetEmailTemplate(slug: string) {
  const template = getDefaultEmailTemplate(slug);
  return updateEmailTemplate(slug, {
    subject: template.subject,
    body: template.body,
    isActive: true,
  });
}
