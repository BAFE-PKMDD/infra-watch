import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { syncLogs } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { buttonHtml, escapeHtml, paragraphsToHtml, wrapEmailHtml } from "@/lib/email-layout";

// Who receives the alert is read from the environment so no email address is stored in the
// code. Set SYNC_FAILURE_ALERT_EMAILS to one address, or several separated by commas.
export function getSyncFailureAlertRecipients(value = process.env.SYNC_FAILURE_ALERT_EMAILS): string[] {
  return (value ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));
}

export function buildSyncFailureEmail({
  attempts,
  failedAt,
  reasons,
  siteUrl,
}: {
  attempts: number;
  failedAt: Date;
  reasons: string[];
  siteUrl?: string;
}) {
  const when = failedAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
  const reasonLines = reasons.length > 0 ? reasons.map((reason) => `- ${reason}`) : ["- No detail was recorded."];
  const syncPage = siteUrl ? `${siteUrl.replace(/\/$/, "")}/sync` : "the ABEMIS Sync page";

  const text = [
    `The ABEMIS sync failed ${attempts} times in a row, one hour apart. The last attempt ended on ${when} (Asia/Manila).`,
    "",
    "What it reported:",
    ...reasonLines,
    "",
    "The project data on the portal was not refreshed by this run, so it may be out of date.",
    "The next scheduled sync will try again automatically. You can also start one by hand from " + syncPage + ".",
    "",
    "If ABEMIS shows an error such as 526, the ABEMIS server itself is down and the sync will work again once it is back.",
  ].join("\n");

  const base = siteUrl?.replace(/\/$/, "");
  const html = wrapEmailHtml({
    siteUrl,
    preheader: `The ABEMIS sync failed ${attempts} times in a row.`,
    bodyHtml:
      `<h1 style="margin:0 0 16px;font-size:22px;color:#14305f">ABEMIS sync failed ${attempts} times in a row</h1>` +
      paragraphsToHtml(`The sync was tried ${attempts} times, one hour apart. The last attempt ended on ${when} (Asia/Manila).`) +
      `<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#172033">What it reported</p><ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#172033">${(reasons.length > 0 ? reasons : ["No detail was recorded."]).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>` +
      paragraphsToHtml("The project data on the portal was not refreshed by this run, so it may be out of date. The next scheduled sync will try again automatically.") +
      (base ? buttonHtml("Open ABEMIS Sync", `${base}/sync`) : "") +
      paragraphsToHtml("If the report shows an error such as 526, the ABEMIS server itself is down. The sync will work again once it is back."),
  });

  return {
    subject: `InfraWatch: ABEMIS sync failed ${attempts} times in a row`,
    text,
    html,
  };
}

async function getLatestSyncErrors(): Promise<string[]> {
  const [latest] = await db
    .select({ errors: syncLogs.errors })
    .from(syncLogs)
    .where(eq(syncLogs.resource, "project"))
    .orderBy(desc(syncLogs.createdAt))
    .limit(1);
  return (latest?.errors ?? []).slice(0, 3).map((error) => String(error).slice(0, 300));
}

// Called once, after the last allowed attempt of an ABEMIS sync has failed.
export async function sendSyncFailureAlert(attempts: number) {
  const recipients = getSyncFailureAlertRecipients();
  if (recipients.length === 0) {
    console.warn("[Sync alert] ABEMIS sync failed, but SYNC_FAILURE_ALERT_EMAILS is not set, so no email was sent.");
    return { sent: false as const, reason: "no-recipients" as const };
  }

  const email = buildSyncFailureEmail({
    attempts,
    failedAt: new Date(),
    reasons: await getLatestSyncErrors().catch(() => []),
    siteUrl: process.env.NEXT_PUBLIC_BASE_URL,
  });
  const result = await sendEmail({ to: recipients, ...email });
  if (!result.success) {
    console.error("[Sync alert] Could not send the sync failure email.", result.error);
    return { sent: false as const, reason: "send-failed" as const };
  }
  return { sent: true as const };
}
