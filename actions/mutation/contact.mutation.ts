"use server";

import { and, count, eq, gte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getAuditContextFromServerAction, logAudit } from "@/lib/audit";
import {
  CONTACT_RATE_LIMIT_MAX,
  CONTACT_RATE_LIMIT_WINDOW_MS,
  contactMessageInputSchema,
  getContactSenderKey,
  isContactMessageStatus,
  type ContactMessageInput,
} from "@/lib/contact-messages";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getCurrentUser, requireAuth } from "@/lib/session";
import { sendTemplatedEmail } from "@/lib/email-templates";

type ContactResult = {
  success: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
};

function getSenderKeySecret() {
  return process.env.CHAT_RATE_LIMIT_SECRET || process.env.BETTER_AUTH_SECRET || "infra-watch-development-contact-secret";
}

export async function createContactMessage(data: ContactMessageInput): Promise<ContactResult> {
  const parsed = contactMessageInputSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: ContactResult["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "name" || field === "email" || field === "subject" || field === "message") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, message: "Check the highlighted fields and try again.", fieldErrors };
  }

  const { website, ...input } = parsed.data;
  // Automated submission caught by the honeypot: report success without storing it.
  if (website) {
    return { success: true, message: "Message received." };
  }

  try {
    const [context, currentUser] = await Promise.all([getAuditContextFromServerAction(), getCurrentUser()]);
    const senderKey = getContactSenderKey(context.ipAddress ?? "unknown", getSenderKeySecret());
    const windowStart = new Date(Date.now() - CONTACT_RATE_LIMIT_WINDOW_MS);

    const [recent] = await db
      .select({ total: count() })
      .from(contactMessages)
      .where(
        and(
          gte(contactMessages.createdAt, windowStart),
          or(eq(contactMessages.senderKey, senderKey), eq(contactMessages.email, input.email)),
        ),
      );

    if ((recent?.total ?? 0) >= CONTACT_RATE_LIMIT_MAX) {
      return {
        success: false,
        message: "You have sent several messages in the last hour. Please wait before sending another, or call the hotline.",
      };
    }

    await db.insert(contactMessages).values({
      ...input,
      senderKey,
      userId: currentUser?.id ?? null,
    });

    // Receipt delivery must not turn a successfully saved message into a failed submission.
    // sendTemplatedEmail reports delivery failures in its result instead of throwing.
    const receiptFailed = () => console.error("Contact message saved, but its email receipt could not be delivered");
    void sendTemplatedEmail("contact-auto-reply", input.email, { recipientName: input.name, originalSubject: input.subject })
      .then(result => { if (!result.success) receiptFailed(); })
      .catch(receiptFailed);

    revalidatePath("/contact-messages");
    return { success: true, message: "Message received." };
  } catch (error) {
    console.error("Failed to store contact message", error);
    return {
      success: false,
      message: "Your message could not be saved. Please try again, or email bafe@da.gov.ph directly.",
    };
  }
}

export async function replyToContactMessage(id: string, response: string) {
  try {
    const user = await requireAuth();
    requirePermission(user.role, "contact_messages", "update");
    const body = response.trim();
    if (body.length < 10 || body.length > 10000) throw new Error("Response must contain 10 to 10,000 characters");
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
    if (!message) throw new Error("Message not found");
    const result = await sendTemplatedEmail("contact-response", message.email, { recipientName: message.name, originalSubject: message.subject, originalMessage: message.message, adminResponse: body });
    if (!result.success) throw new Error(result.error || "Email could not be sent");
    await db.update(contactMessages).set({ status: "in_progress", handledBy: user.id, handledAt: new Date(), updatedAt: new Date() }).where(eq(contactMessages.id, id));
    await logAudit({ tableName: "contact_messages", recordId: id, action: "UPDATE", notes: "Staff email response sent using the contact-response template", context: await getAuditContextFromServerAction(user) });
    revalidatePath("/contact-messages");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Response could not be sent" };
  }
}

export async function updateContactMessageStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    requirePermission(user.role, "contact_messages", "update");

    if (!isContactMessageStatus(status)) {
      return { success: false, error: "Unknown status." };
    }

    const [existing] = await db
      .select({ id: contactMessages.id, status: contactMessages.status })
      .from(contactMessages)
      .where(eq(contactMessages.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Message not found." };
    }

    const now = new Date();
    await db
      .update(contactMessages)
      .set({
        status,
        handledBy: status === "new" ? null : user.id,
        handledAt: status === "new" ? null : now,
        updatedAt: now,
      })
      .where(eq(contactMessages.id, id));

    await logAudit({
      tableName: "contact_messages",
      recordId: id,
      action: "UPDATE",
      oldValues: { status: existing.status },
      newValues: { status },
      context: await getAuditContextFromServerAction(user),
    });

    revalidatePath("/contact-messages");
    return { success: true };
  } catch (error) {
    console.error("Failed to update contact message status", error);
    return { success: false, error: error instanceof Error ? error.message : "Could not update the message." };
  }
}
