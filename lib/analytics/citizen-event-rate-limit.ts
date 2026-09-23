type GlobalLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export function createGlobalCitizenEventLimiter({
  limit,
  windowMs,
  now = Date.now,
}: GlobalLimiterOptions) {
  let windowStartedAt = now();
  let accepted = 0;

  return function allowCitizenEvent() {
    const current = now();
    if (current - windowStartedAt >= windowMs) {
      windowStartedAt = current;
      accepted = 0;
    }
    if (accepted >= limit) return false;
    accepted += 1;
    return true;
  };
}

export const allowCitizenEventIngestion = createGlobalCitizenEventLimiter({
  limit: 600,
  windowMs: 60_000,
});
