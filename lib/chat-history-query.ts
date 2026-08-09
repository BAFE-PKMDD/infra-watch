const CHAT_HISTORY_STATUSES = new Set([
  "processing",
  "completed",
  "refused",
  "failed",
  "aborted",
  "timed_out",
]);

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseChatHistoryQuery(params: URLSearchParams) {
  const requestedStatus = params.get("status")?.trim().toLowerCase();
  const requestedProvider = params.get("provider")?.trim().toLowerCase();

  return {
    page: parsePositiveInteger(params.get("page"), 1),
    limit: Math.min(parsePositiveInteger(params.get("limit"), 25), 100),
    status:
      requestedStatus && CHAT_HISTORY_STATUSES.has(requestedStatus)
        ? requestedStatus
        : undefined,
    provider:
      requestedProvider && /^[a-z0-9_-]{1,40}$/.test(requestedProvider)
        ? requestedProvider
        : undefined,
  };
}
