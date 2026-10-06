// Mobile numbers the gateway can actually deliver to: 09XXXXXXXXX, 639XXXXXXXXX or
// +639XXXXXXXXX. Anything else (the feed's "Not provided", a telco short code or sender
// name) is a message we can read but cannot reply to. Kept free of server imports so the
// review page can use it to disable reply buttons.
const PH_MOBILE_PATTERN = /^(?:\+?63|0)9\d{9}$/;

export function isReplyableContact(contactNumber: string): boolean {
  return PH_MOBILE_PATTERN.test(contactNumber.replace(/[\s-]/g, ""));
}
