import { createHmac } from "node:crypto";

import { z } from "zod";

export const CONTACT_MESSAGE_STATUSES = ["new", "in_progress", "resolved"] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export const CONTACT_MESSAGE_STATUS_LABELS: Record<ContactMessageStatus, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
};

// A sender may submit this many messages per window before being asked to wait.
export const CONTACT_RATE_LIMIT_MAX = 5;
export const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const contactMessageInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  email: z.string().trim().toLowerCase().max(254, "Email must be 254 characters or fewer").pipe(z.email("Enter a valid email address")),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be 200 characters or fewer"),
  message: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters")
    .max(5000, "Message must be 5,000 characters or fewer"),
  // Honeypot: hidden from people, so any value means an automated submission.
  website: z.string().optional(),
});

export type ContactMessageInput = z.input<typeof contactMessageInputSchema>;

export function isContactMessageStatus(value: unknown): value is ContactMessageStatus {
  return typeof value === "string" && (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(value);
}

/**
 * Keyed hash of the sender's network address, stored instead of the raw IP so repeat
 * submissions can be rate limited without keeping the address itself.
 */
export function getContactSenderKey(ipAddress: string, secret: string) {
  return createHmac("sha256", secret).update(`contact:${ipAddress}`).digest("hex");
}
