import assert from "node:assert/strict";
import test from "node:test";

import { contactMessageInputSchema, getContactSenderKey, isContactMessageStatus } from "./contact-messages";

const valid = {
  name: " Juan Dela Cruz ",
  email: " Juan@Example.com ",
  subject: "Irrigation canal",
  message: "The canal gate near our farm is broken.",
};

test("contact input is trimmed and the email normalized", () => {
  const parsed = contactMessageInputSchema.parse(valid);
  assert.equal(parsed.name, "Juan Dela Cruz");
  assert.equal(parsed.email, "juan@example.com");
});

test("contact input rejects invalid email, short messages, and oversized fields", () => {
  assert.equal(contactMessageInputSchema.safeParse({ ...valid, email: "not-an-email" }).success, false);
  assert.equal(contactMessageInputSchema.safeParse({ ...valid, message: "too short" }).success, false);
  assert.equal(contactMessageInputSchema.safeParse({ ...valid, subject: "x".repeat(201) }).success, false);
  assert.equal(contactMessageInputSchema.safeParse({ ...valid, message: "x".repeat(5001) }).success, false);
  assert.equal(contactMessageInputSchema.safeParse({ ...valid, name: "   " }).success, false);
});

test("sender key is stable per address and does not contain the address", () => {
  const first = getContactSenderKey("203.0.113.7", "secret");
  assert.equal(first, getContactSenderKey("203.0.113.7", "secret"));
  assert.notEqual(first, getContactSenderKey("203.0.113.8", "secret"));
  assert.doesNotMatch(first, /203\.0\.113/);
});

test("only known statuses are accepted", () => {
  assert.equal(isContactMessageStatus("resolved"), true);
  assert.equal(isContactMessageStatus("deleted"), false);
  assert.equal(isContactMessageStatus(undefined), false);
});
