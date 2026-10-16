import { createHmac } from "node:crypto";

/**
 * Keyed hash of the sender's network address, stored instead of the raw IP so repeat
 * submissions can be rate limited without keeping the address itself.
 */
export function getContactSenderKey(ipAddress: string, secret: string) {
  return createHmac("sha256", secret).update(`contact:${ipAddress}`).digest("hex");
}
