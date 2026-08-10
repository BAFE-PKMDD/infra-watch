import assert from "node:assert/strict";
import test from "node:test";

import { resetOtpTimerState, type OtpTimerState } from "./otp-verification-form";

test("resending after expiry creates a later deadline and restarts the timer generation", () => {
  const expired: OtpTimerState = { expiresAt: 1_000, generation: 0 };
  const reset = resetOtpTimerState(expired, 10_000, 180);

  assert.deepEqual(reset, {
    expiresAt: 190_000,
    generation: 1,
  });
});

test("every successful resend advances the timer generation", () => {
  const initial: OtpTimerState = { expiresAt: 190_000, generation: 3 };
  assert.equal(resetOtpTimerState(initial, 20_000, 180).generation, 4);
});
