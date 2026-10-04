"use server";

import { sendSMS } from "@/lib/sms";
import { canAccessAdmin } from "@/lib/session";
import { canUseSmsPrototype } from "@/lib/sms-grievance/policy";

type SendResult = { success: boolean; error?: string };

// Sends a real acknowledgment SMS for the "Simulate incoming message" prototype tool —
// the only place in the SMS grievance module allowed to actually call the gateway, since
// it's the only case where the phone number is one a staff member typed in themselves to
// test the flow, never a real citizen's number from the live feed or a fixture. Gated the
// same way the review page itself is (admin/moderator/regional_admin, non-production) so
// this can't be reached by crafting a request directly against the server action.
export async function sendSimulatedAcknowledgmentSms(mobile: string, message: string): Promise<SendResult> {
  const canManageIssues = await canAccessAdmin();
  if (!canUseSmsPrototype({ nodeEnv: process.env.NODE_ENV, canManageIssues })) {
    return { success: false, error: "Not authorized to use the SMS grievance prototype." };
  }

  const result = await sendSMS(mobile, message);
  return { success: result.success, error: result.error };
}
