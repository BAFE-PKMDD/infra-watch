import { buildAcknowledgmentReply } from "@/lib/sms-grievance/auto-response";
import { fetchLiveSmsGrievanceRecords } from "@/lib/sms-grievance/live-source";
import { applySmsPrototypeAction, type PrototypeAction } from "@/lib/sms-grievance/prototype-state";
import type { SmsReviewStore } from "@/lib/sms-grievance/review-store";
import { appendFollowUpMessage } from "@/lib/sms-grievance/simulate-incoming";
import type { SmsConversationItem, SmsMockScenario } from "@/types/sms-grievance.types";

export type SendSms = (mobile: string, message: string) => Promise<{ success: boolean; error?: string }>;

export type LiveReviewDeps = {
  store: SmsReviewStore;
  send: SendSms;
  /** Returns the current record for a live message id, straight from the SMS line. */
  loadLive: (messageId: string) => Promise<SmsMockScenario | null>;
  now?: () => string;
};

export type LiveActionResult = {
  records: SmsMockScenario[];
  /** Present only when an SMS to the sender was attempted. */
  delivery?: { success: boolean; error?: string };
};

export class LiveReviewConflictError extends Error {
  constructor() {
    super("Another staff member just changed this message. Reload the page to see their update, then try again.");
    this.name = "LiveReviewConflictError";
  }
}

// Mobile numbers the gateway can actually deliver to: 09XXXXXXXXX, 639XXXXXXXXX or
// +639XXXXXXXXX. Anything else (the feed's "Not provided", a telco short code or sender
// name) is a message we can read but cannot reply to.
const PH_MOBILE_PATTERN = /^(?:\+?63|0)9\d{9}$/;

export function isReplyableContact(contactNumber: string): boolean {
  return PH_MOBILE_PATTERN.test(contactNumber.replace(/[\s-]/g, ""));
}

const NO_REPLY_NUMBER_ERROR = "This message has no mobile number to reply to.";

export async function loadLiveRecordFromFeed(messageId: string): Promise<SmsMockScenario | null> {
  const records = await fetchLiveSmsGrievanceRecords();
  return records.find((record) => record.id === messageId) ?? null;
}

function newOutboundItems(before: SmsMockScenario, after: SmsMockScenario): SmsConversationItem[] {
  const knownIds = new Set(before.conversation.map((item) => item.id));
  return after.conversation.filter((item) => item.kind === "outbound_sms" && !knownIds.has(item.id));
}

function withDelivery(record: SmsMockScenario, itemIds: ReadonlySet<string>, success: boolean): SmsMockScenario {
  const deliveryStatus = success ? "sent" as const : "send_failed" as const;
  return {
    ...record,
    deliveryStatus,
    conversation: record.conversation.map((item) => (itemIds.has(item.id) ? { ...item, deliveryStatus } : item)),
  };
}

// Sends every not-yet-delivered outbound item on `claimed`, then records the outcome. The
// reviewed state was already saved before this runs, so a failed send leaves a visible
// "failed" entry in the thread rather than losing the staff decision.
async function sendAndRecord(
  deps: LiveReviewDeps,
  claimed: SmsMockScenario,
  claimedVersion: number,
  items: SmsConversationItem[],
  actor: string,
): Promise<{ record: SmsMockScenario; delivery: { success: boolean; error?: string } }> {
  let delivery: { success: boolean; error?: string };
  if (!isReplyableContact(claimed.contactNumber)) {
    delivery = { success: false, error: NO_REPLY_NUMBER_ERROR };
  } else {
    delivery = { success: true };
    for (const item of items) {
      const result = await deps.send(claimed.contactNumber, item.body);
      if (!result.success) {
        delivery = { success: false, error: result.error ?? "The SMS gateway rejected the message." };
        break;
      }
    }
  }

  const finalRecord = withDelivery(claimed, new Set(items.map((item) => item.id)), delivery.success);
  // Best effort: if this write loses a race the SMS already went out, and the next
  // reviewer simply sees the state without the final delivery tick.
  await deps.store.update(finalRecord, claimedVersion, actor);
  return { record: finalRecord, delivery };
}

// Applies one staff action to a real message: validates it with the same rules the
// prototype used, saves the new state *before* anything is sent (the version check is what
// stops two reviewers both sending the same reply), then sends the SMS and records whether
// it was delivered.
export async function runLiveSmsAction(
  deps: LiveReviewDeps,
  messageId: string,
  action: PrototypeAction,
  actor: string,
): Promise<LiveActionResult> {
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const existing = await deps.store.get(messageId);
  const base = existing?.record ?? await deps.loadLive(messageId);
  if (!base) throw new Error("This message is no longer on the SMS grievance line.");

  const next = applySmsPrototypeAction(base, action, { live: true, now });
  const claimed = existing
    ? await deps.store.update(next, existing.version, actor)
    : await deps.store.create(next, actor);
  if (!claimed) throw new LiveReviewConflictError();

  const outbound = newOutboundItems(base, next);
  if (outbound.length === 0) return { records: [next] };

  const savedVersion = (existing?.version ?? 0) + 1;
  const { record, delivery } = await sendAndRecord(deps, next, savedVersion, outbound, actor);
  return { records: [record], delivery };
}

// Folds a second message from the same sender into their existing case, closes the new
// message as a copy, and tells the sender the follow-up was added to their ticket.
export async function runLiveSmsLink(
  deps: LiveReviewDeps,
  messageId: string,
  threadId: string,
  actor: string,
): Promise<LiveActionResult> {
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const selectedStored = await deps.store.get(messageId);
  const selected = selectedStored?.record ?? await deps.loadLive(messageId);
  const threadStored = await deps.store.get(threadId);
  const thread = threadStored?.record ?? await deps.loadLive(threadId);
  if (!selected || !thread) throw new Error("One of these messages is no longer on the SMS grievance line.");
  if (selected.id === thread.id) throw new Error("A message can't be linked to itself.");
  if (selected.contactNumber !== thread.contactNumber) throw new Error("Only messages from the same sender can be linked.");

  const closedCopy = applySmsPrototypeAction(selected, {
    type: "mark_duplicate",
    reason: `Linked to existing case ${thread.externalMessageId} from the same sender.`,
    duplicateOf: thread.id,
  }, { live: true, now });
  const claimedSelected = selectedStored
    ? await deps.store.update(closedCopy, selectedStored.version, actor)
    : await deps.store.create(closedCopy, actor);
  if (!claimedSelected) throw new LiveReviewConflictError();

  const updatedThread = appendFollowUpMessage(thread, selected.originalText);
  const claimedThread = threadStored
    ? await deps.store.update(updatedThread, threadStored.version, actor)
    : await deps.store.create(updatedThread, actor);
  if (!claimedThread) throw new LiveReviewConflictError();

  const outbound = newOutboundItems(thread, updatedThread);
  const threadVersion = (threadStored?.version ?? 0) + 1;
  const { record, delivery } = await sendAndRecord(deps, updatedThread, threadVersion, outbound, actor);
  return { records: [record, closedCopy], delivery };
}

export type AutoAcknowledgeOptions = {
  enabled: boolean;
  /** Only messages received at or after this instant are acknowledged. */
  since: Date | null;
  maxPerRun?: number;
};

export type AutoAcknowledgeResult = {
  acknowledged: number;
  failed: number;
  skippedReason?: string;
};

export function readAutoAcknowledgeOptions(env: Record<string, string | undefined> = process.env): AutoAcknowledgeOptions {
  const sinceRaw = env.SMS_AUTO_ACK_SINCE?.trim();
  const since = sinceRaw ? new Date(sinceRaw) : null;
  return {
    enabled: env.SMS_AUTO_ACK_ENABLED === "true",
    since: since && !Number.isNaN(since.getTime()) ? since : null,
  };
}

// Replies to each newly received message once, asking for the project details, without
// waiting for staff. Safe to run on a timer: a review row is inserted *before* the SMS is
// sent, and the insert only succeeds once per message, so overlapping runs or restarts
// can't send a second acknowledgment. Messages older than `since` are never touched, so
// turning this on doesn't text people about reports from months ago.
export async function runSmsAutoAcknowledgments(
  deps: Pick<LiveReviewDeps, "store" | "send" | "now"> & { listLive: () => Promise<SmsMockScenario[]> },
  options: AutoAcknowledgeOptions,
): Promise<AutoAcknowledgeResult> {
  if (!options.enabled) return { acknowledged: 0, failed: 0, skippedReason: "disabled" };
  if (!options.since) return { acknowledged: 0, failed: 0, skippedReason: "SMS_AUTO_ACK_SINCE is missing or not a valid date" };
  const since = options.since.getTime();
  const maxPerRun = options.maxPerRun ?? 20;
  const now = (deps.now ?? (() => new Date().toISOString()))();

  const live = await deps.listLive();
  const candidates = live.filter((record) => (
    new Date(record.receivedAt).getTime() >= since
    && record.status === "needs_relevance_review"
    && isReplyableContact(record.contactNumber)
  ));
  const alreadyHandled = await deps.store.getMany(candidates.map((record) => record.id));

  let acknowledged = 0;
  let failed = 0;
  for (const record of candidates) {
    if (acknowledged + failed >= maxPerRun) break;
    if (alreadyHandled.has(record.id)) continue;

    const ack: SmsConversationItem = {
      id: `${record.id}-outbound-ack`,
      kind: "outbound_sms",
      body: buildAcknowledgmentReply(record.externalMessageId),
      occurredAt: now,
      deliveryStatus: "simulated_pending",
    };
    const claimedRecord: SmsMockScenario = {
      ...record,
      deliveryStatus: "simulated_pending",
      conversation: [...record.conversation, ack],
    };
    const claimed = await deps.store.create(claimedRecord, "system:auto-acknowledgment");
    if (!claimed) continue;

    const result = await deps.send(record.contactNumber, ack.body);
    await deps.store.update(withDelivery(claimedRecord, new Set([ack.id]), result.success), 1, "system:auto-acknowledgment");
    if (result.success) acknowledged += 1;
    else failed += 1;
  }

  return { acknowledged, failed };
}
