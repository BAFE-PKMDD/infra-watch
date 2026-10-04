import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  buildAcknowledgmentReply,
  buildBafeCaseOpenedReply,
  buildNotBafeProjectReply,
  mintSmsGrievanceCaseId,
  SAMPLE_SMS_PREFIX,
} from "./auto-response";

test("buildAcknowledgmentReply always lists every requested field plus the disregard note, in Filipino, with no sample prefix baked in", () => {
  const body = buildAcknowledgmentReply("SMS-2026-000013");

  assert.ok(!body.startsWith(SAMPLE_SMS_PREFIX));
  assert.match(body, /Ticket Blg\. SMS-2026-000013/);
  assert.match(body, /1\. Uri ng Proyekto/);
  assert.match(body, /2\. Pangalan ng Nagpadala \(opsyonal\)/);
  assert.match(body, /3\. Edad/);
  assert.match(body, /4\. Kasarian/);
  assert.match(body, /5\. Lokasyon/);
  assert.match(body, /6\. Concern/);
  assert.match(body, /balewalain/);
});

test("buildNotBafeProjectReply for a general/unrelated message says it isn't connected to BAFE, with no redirect line", () => {
  const body = buildNotBafeProjectReply("Not in the BAFE project registry.", "not_related_to_infrawatch");
  assert.ok(body.startsWith(SAMPLE_SMS_PREFIX));
  assert.match(body, /Not in the BAFE project registry\./);
  assert.match(body, /isn't related to a BAFE project or program/);
  assert.doesNotMatch(body, /reach out to the agency responsible/);
});

test("buildNotBafeProjectReply for a different agency's project redirects the sender instead of implying the report was invalid", () => {
  const body = buildNotBafeProjectReply("This is a DPWH road project.", "different_agency_project");
  assert.ok(body.startsWith(SAMPLE_SMS_PREFIX));
  assert.match(body, /This is a DPWH road project\./);
  assert.match(body, /different government agency, not BAFE/);
  assert.match(body, /reach out to the agency responsible for that project directly/);
});

test("buildBafeCaseOpenedReply includes the minted case ID", () => {
  const body = buildBafeCaseOpenedReply("SMS-GRIEVANCE-0020");
  assert.ok(body.startsWith(SAMPLE_SMS_PREFIX));
  assert.match(body, /SMS-GRIEVANCE-0020/);
});

test("mintSmsGrievanceCaseId is deterministic and based on the trailing digits of the external message ID", () => {
  assert.equal(mintSmsGrievanceCaseId({ externalMessageId: "BAFE-SMS-20" }), "SMS-GRIEVANCE-0020");
  assert.equal(mintSmsGrievanceCaseId({ externalMessageId: "SMS-2026-000001" }), "SMS-GRIEVANCE-0001");
  assert.equal(mintSmsGrievanceCaseId({ externalMessageId: "SMS-2026-000001" }), mintSmsGrievanceCaseId({ externalMessageId: "SMS-2026-000001" }));
});
